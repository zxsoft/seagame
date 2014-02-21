angular.module('seagame',[])
    .directive('shop',function (Ships){
        return {
            restrict:'EA',
            templateUrl:'shop.html',
            link:function(scope){
                scope.Ships=Ships
            }
        }
    })
    .directive('ship',function ($timeout,Game){
        return {
            restrict:'EA',
            templateUrl : 'ship.html',
            scope:{
                data:'='
            },
            controller:function($interval,$scope){
                var c=$scope;
                var data= c.data;
                c.start=function(){
                    if(data.current>= data.capacity)return;
                    data.state='running';
                    c.timer=$interval(function (){
                        if(!data.timeleft){
                            c.resetTime();
                        }
                        data.timeleft--;
                        if(data.timeleft<=0){
                            c.harvest();
                            c.resetTime();
                        }
                    },1000);
                }
                
                c.sell=function (){
                    if(Game.ships.length==1){
                        alert("您就一条船了，不能再卖了啊。。");
                        return;
                    };
                    Game.sell(data);
                }

                c.resetTime=function (){
                    data.timeleft=data.needtime;
                }

                c.harvest=function(){
                    data.current+=data.harvestamount;
                    if(data.current>=data.capacity){
                        data.current=data.capacity;
                        c.stop();
                    }
                }
                
                c.get=function (){
                    if(data.current<=0)return;
                    Game.get(data.current);
                    data.current=0;
                }

                c.stop=function (){
                    $interval.cancel(c.timer);
                    delete c.timer;
                    data.state='idle';
                }

                if(data.state=='running')
                    c.start();
            }

        }
    })
    .value('Utils',{
        timeunit: function (time){
                var days,hours,minutes,seconds;
                seconds = time % 60;
                time-=seconds;
                time/=60;//分钟
                minutes = time % 60;
                time-=minutes;
                time/=60; //小时
                hours = time % 24;
                time-=hours;
                days=time/24;
                var str='';
                if(days>0){
                    str=days+'天';
                }

                if(hours>0){
                    str+=hours+'小时';
                }else{
                    if(str.length>0 & (minutes>0 || seconds>0)){
                        str+='零';
                    }
                }

                if(minutes>0){
                    str+=minutes+'分钟';
                }else{
                    if(str.length>0 && str[str.length-1]!='零' && seconds>0){
                        str+='零';
                    }
                }

                if(seconds>0){
                    str+=seconds+'秒';
                }
                return str;
            }
    })
    .filter('timeunit',function(Utils){
        return Utils.timeunit;
    })
    .service('Game',function (Ships,$interval,Utils,$timeout){
        var Game=this;
        Game.money=0;
        Game.fish=0;
        Game.fishPrice=2;
        function Ship(index){
            var ship=this;

            angular.extend(ship,Ships[index]);

            if(ship.timeleft==undefined){
                ship.timeleft=ship.needtime;
            }
        }
        Game.ships=[new Ship(0)];
        $interval(function(){
            Game.save();
        },1000);
        Game.buy=function (shipIndex){
            if(Game.ships.length>=12){
                alert('最多只能拥有12条船');
                return;
            }
            var ship=Ships[shipIndex];
            if(!ship || !ship.price){
                alert('找不到要买的船!');
                return;
            }
            if(Game.money<ship.price){
                alert('金钱不足!');
                return;
            };
            Game.money-=ship.price;
            Game.ships.push(new Ship(shipIndex));

            if(Game.ships.length>=12){
                var win=true;
                for(var i=0;i<Game.ships.length;i++){
                    if(Game.ships[i].title!='异次元捕鱼船'){
                        win=false;
                        break;
                    }
                }
                if(win){
                    var nowTime=new Date().getTime();
                    var lastSaveTime=angular.fromJson(localStorage.getItem('startTime')) || nowTime;
                    var period=Math.floor((nowTime-lastSaveTime)/1000);
                    $timeout(function(){
                        alert('恭喜您!!!!\n\n您成功收集了12条异次元捕鱼船，获得了大捕鱼家称号！您通关所用的游戏时间为：' + Utils.timeunit(period));
                    },0);
                }
            }

        }
        Game.sell=function (ship){
            for(var i=0;i<Game.ships.length;i++){
                if(ship==Game.ships[i]){
                    if(confirm('要以'+Math.floor(ship.price/2)+'元卖掉'+ship.title+'吗?')){
                        Game.money+=Math.floor(ship.price/2);
                        Game.ships.splice(i,1);


                        return;
                    }

                }
            }

        }
        Game.save=function(key){
            localStorage.setItem('lastSaveTime',new Date().getTime());
            if(key){
                if(typeof Game[key]!='function'){
                    localStorage.setItem(key,angular.toJson(Game[key]));
                }
                return;
            }
            if(!localStorage.getItem('startTime')){
                localStorage.setItem('startTime',new Date().getTime());
            }
            for(var key in Game){
                Game.save(key);
            }
        }

        Game.load=function(){
            for(var i=0;i<localStorage.length;i++){
                Game[localStorage.key(i)]=angular.fromJson(localStorage.getItem(localStorage.key(i)));
            }
            var nowTime=new Date().getTime();
            var lastSaveTime=angular.fromJson(localStorage.getItem('lastSaveTime')) || nowTime;
            var period=Math.floor((nowTime-lastSaveTime)/1000);
            Game.consume(period);
            Game.save();
        };

        //for debug use
        window.reset=function(){
            if(confirm('确定要重新玩吗？')){
                localStorage.clear();
                location.reload();
            }
        }

        Game.consume=function(period){
            function consumeShip(ship,period){
                if(ship.state=='idle')return;
                var times=Math.floor(period / ship.needtime);
                ship.current+=ship.harvestamount*times;
                if(ship.current>=ship.capacity){
                    ship.current=ship.capacity;
                    ship.state='idle';
                }
                period=period % ship.needtime;
                ship.timeleft-=period;
                if(ship.timeleft<0)ship.timeleft=0;
            }
            if(period==0)return;
            for(var i=0;i<Game.ships.length;i++){
                consumeShip(Game.ships[i],period);
            }
        }

        Game.load();

        Game.get=function (fish){
            Game.fish+=fish;
        }

        Game.sellFish=function (){
            Game.money+=Math.floor(Game.fish*Game.fishPrice);
            Game.fish=0;
        }

        !function FishPriceAdjust(){
            var step=0.05-Math.random()/10;
            Game.fishPrice+=step;
            if(Game.fishPrice<1)Game.fishPrice=1;
            if(Game.fishPrice>5)Game.fishPrice=5;
            setTimeout(FishPriceAdjust,1000);
        }();
    })
    .value('Ships',[
        {
                title:'小渔船',
                harvestamount:1000,
                needtime:6,
                capacity:2000,
                current:0,
                state:'idle',
                price:2000,
                imgClass:'ship1'
        } ,{
            title:'大帆船',
            harvestamount:5000,
            needtime:30,
            capacity:10000,
            current:0,
            state:'idle',
            price:50000,
            imgClass:'ship2'
        } ,{
            title:'豪华快艇',
            harvestamount:1500,
            needtime:2,
            capacity:20000,
            current:0,
            state:'idle',
            price:200000,
            imgClass:'ship3'
        } ,{
            title:'异次元捕鱼船',
            harvestamount:20000,
            needtime:60,
            capacity:50000,
            current:0,
            state:'idle',
            price:500000,
            imgClass:'ship4'
        }


    ]).run(function (Game,$rootScope){
        $rootScope.Game=Game;
    });