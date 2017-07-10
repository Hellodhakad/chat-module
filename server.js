var express=require('express');
var app=express();
var http=require('http').Server(app);
var io=require('socket.io')(http);
var path = require('path');
var bodyParser=require('body-parser');
var mongoose=require('mongoose');
var cookieParser=require('cookie-parser');

mongoose.Promise=require('bluebird');
var mongooseConnectString='mongodb://127.0.0.1:27017/chat';
//var mongooseConnectString='mongodb://heroku_4pwbk2m8:78t57todm4duf3cmh1rmj3f6k5@ds123361.mlab.com:23361/heroku_4pwbk2m8';

mongoose.connect(mongooseConnectString,function(err,res){
  if(err){
    console.log('Error connecting to mongoose:'+err);
  }else{
    console.log('Successfully connected to Mongoose: '+mongooseConnectString);
  }
});

var clientSchema=new mongoose.Schema({
  clientId:{type:String},
  customId:{type:String},
  password:{type:String},
  groups:[],
  friends:[]
});

var Client=mongoose.model('Client',clientSchema);

app.set('port', process.env.PORT || 3000);
app.use(cookieParser());
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, 'public')));



app.get('/',function(req,res){
  res.sendFile(__dirname+'/index.html');
});

app.post('/signup',function(req,res){
	if(req.body.username){
		var client=new Client({
			customId:req.body.username,
			clientId:'',
      password:req.body.password
		});
		client.save(function(err){
			if(err){
				console.log('Error in saving new user: '+err);
			}else{
				console.log('New user joined:'+client);
				res.redirect('/');
			}
		});
	}else{
		res.redirect('/');
	}
});

app.post('/login',function(req,res){
  console.log('Try to login: \nUsername: '+req.body.username+' Password: '+req.body.password);
  Client.findOne({customId:req.body.username,password:req.body.password},function(err,client){
    if(err){
      console.log('Error in logging user:'+err);
      res.json({success:false,data:'Login failed. Try again'});
    }else{
      if(client){
        console.log('User logged in');
        res.cookie('customId', req.body.username, { path: '/dashboard' });
        res.redirect('/dashboard');
      }else{
        console.log('Invalid username or password');
        res.json({success:false,data:'Invalid username or password.'});
      }
    }
  });
});

app.get('/dashboard',function(req,res){
	if(req.cookies.customId){
		res.sendFile(__dirname+'/dashboard.html');
	}
	else{
		res.redirect('/');
	}
});

app.get('/users',function(req,res){
  Client.find(function(err,clients){
    if(err){
      return res.json({success:false,data:'Could not fetch users right now. Please try again.'});
    }else{
      if(clients){
        return res.json({success:true,data:clients});
      }else{
        return res.json({success:false,data:'No users present. Proceed with registration'});
      }
    }
  });
});

app.get('/startChat',function(req,res){
	if(req.cookies.customId){
		console.log('cookie available');
		res.sendFile(__dirname+'/chat.html');
	}else{
		console.log('cookie was not available so redirected to homepage');
	}
});

io.on('connection',function(socket){
  console.log('\na user connected\n');

  //connect event
  socket.on('storeClientInfo',function(data){
    var client=new Client();
    client.customId=data.customId;
	if(client.customId){
		Client.findOne({customId:client.customId},function(err,client1){
			if(err){
				console.log('Error in fetching client:'+err);
			}else{
				if(client1){
					client1.clientId=socket.id;
					client1.save(function(err){
						if(err){
							console.log('Error in saving client: '+err);
						}else{
							console.log('Client saved successfully: '+client1);
						}
					});
				}
			}
		});
	}else{
		console.log('No custom Id found');
	}
  });
  //disconnect event
  socket.on('disconnect',function(){
	  console.log('\nA user disconnected\n');
    /*Client.findOne({clientId:socket.id},function(err,client){
      if(err){
        console.log('Error in searching client:'+err);
      }else{
        if(client){
          Client.remove({clientId:client.clientId},function(err){
            if(err){
              console.log('Error in deleting client: '+err);
            }else{
              console.log('Client deleted successfully:'+client);
            }
          });
        }
      }
    });*/
  });

  //chat message event
  socket.on('chat message',function(msg){
    io.emit('chat message',msg);
    console.log('New message: \n\tFrom: '+msg.from+'\n\tTo:'+msg.to+'\n\tMessage:'+msg.msg);
  });
});

http.listen(app.get('port'),function(){
  console.log('Express server listening on port:'+app.get('port'));
});
