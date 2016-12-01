var express=require('express');
var bodyParser=require('body-parser')
var mysql=require('mysql')
var request=require('request');
var sha1 = require('sha1');
var cors=require('cors')

var connection = mysql.createConnection({
  host     : '52.41.195.107',
  user     : 'nitin.kumar',
  password : 'nitin@1234',
  database : 'settle',
});

var port = process.env.PORT || 8080;

var app=express();
app.use(bodyParser.json())
app.use(cors())
// app.use(function(req,res,next){
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Content-Type');
//     next();
// })
app.get('/api',function(req,res){
  res.send("working");
})
  
app.post('/api/signup', function(req,res){
    var data={
        user_name:req.body.user_name,
        number:req.body.number,
        email:req.body.email,
        password:sha1(req.body.password),
        verified:0,
        otp:Number(new Date()).toString().substring(1,5)
    }
    console.log(data)
    connection.query('SELECT * FROM user WHERE number = ? AND verified=0',[req.body.number],function(err,result){
        if(err) return console.log(err)
        console.log(result)
        if(result[0]){
            return res.json({"error":true,"detail":"User already exists"})
        }else{
            //send otp here

            request('http://admagister.in/api.php?username=MovingPIN2016&password=dial$842&sender=MVGPIN&sendto='+req.body.number+'&message=Your Otp is : '+data.otp, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(body) // Show the HTML for the Google homepage. 
                }
            })

            connection.query("INSERT INTO `user` SET ?",[data],function(err,result2){
                if(err) return console.log(err)
                res.json({"error":false,"detail":"User registered & OTP sent"})
                
            })
        }
    })
})
    
app.post('/api/signup/verify',function(req,res){
    console.log(req.body)
    connection.query('SELECT * FROM user WHERE number = ? AND verified=0',[req.body.number,req.body.otp],function(err,result){
        if(err) return console.log(err)
        if(result[0]){
            if(result[0].otp == req.body.otp){
                res.json({"error":false,"detail":"Success"})
                connection.query('UPDATE user SET verified=1 WHERE number = ?',[req.body.number],function(err,results){
                    if(err) return console.log(err)
                    console.log("Updated")
                })
            }else{
                res.json({"error":true,"detail":"Wrong OTP"})
            }         
        }else{
            res.json({"error":true,"detail":"No user found"})
        }
    })
})

app.post('/api/signin',function(req,res){
    console.log(req.body)
    connection.query('SELECT * FROM user WHERE number = ? AND password = ? AND verified=1',[req.body.mobile,sha1(req.body.password)],function(err,result){
        if(err) return console.log(err)
        if(result[0]){
            res.json({"error":false,"detail":"Success"})
        }else{
            res.json({"error":true,"detail":"Wrong Credentials"})
        }
    })
})

app.post('/api/givemoney',function(req,res){
    var data={
        receiver_name:req.body.receiver_name,
        giver_mobile:req.body.giver_mobile,
        receiver_mobile:req.body.receiver_mobile,
        amount:req.body.amount,
        datetime:new Date()
    }
    connection.query('INSERT INTO give_money SET ?',[data],function(err,result){
        if(err) return console.log(err)
        console.log("data sent")
        res.json({"error":false})
    })
})

app.get('/api/givemoney/:number',function(req,res){
    connection.query('SELECT * FROM give_money WHERE giver_mobile = ?',[req.params.number],function(err,result){
        res.json(result)
    })
})

app.post('/api/requestmoney',function(req,res){
    var otp=Number(new Date()).toString().substring(1,5);
    var data={
        payee_name:req.body.payee_name,
        requester_mobile:req.body.requester_mobile,
        payee_mobile:req.body.payee_mobile,
        amount:req.body.amount,
        pending:1,
        datetime:new Date(),
        otp:otp
    }
    connection.query('INSERT INTO take_money SET ?',[data],function(err,result){
        if(err) return console.log(err)
        console.log("added")
        res.json({"error":false})
    })
    request('http://admagister.in/api.php?username=MovingPIN2016&password=dial$842&sender=MVGPIN&sendto='+data.payee_mobile+'&message=Someone requested money from you, Your otp is : '+data.otp, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(body) // Show the HTML for the Google homepage. 
                }
    })
})

app.get('/api/pending/:number',function(req,res){
    connection.query('SELECT * FROM take_money WHERE payee_mobile = ? AND pending=1',[req.params.number],function(err,result){
        if(err) return console.log(err)
        res.json({"error":false,"detail":result})
    })
})

app.get('/api/pending/requester/:number',function(req,res){
    connection.query('SELECT * FROM take_money WHERE requester_mobile = ?',[req.params.number],function(err,result){
        if(err) return console.log(err)
        res.json({"error":false,"detail":result})
    })
})

app.post('/api/approve',function(req,res){
    connection.query('UPDATE take_money SET pending=1 WHERE take_money_id = ? AND payee_mobile=?',[req.body.take_money_id,req.body.payee_mobile],function(err,result){
        if(err) return console.log(err)
        res.json({"error":false,"detail":"Completed"})
    })
})

// app.post('api/approve/requester',function(req,res){
//     connection.query('SELECT * FROM take_money WHERE requester_mobile=? AND pending=1 AND take_money_id=?',[req.body.requester_mobile,req.body.take_money_id],function(err,result){
//         if(err) return console.log(err)
//         if(result[0]){
//             connection.query('UPDATE take_money SET pending=0 WHERE take_money_id = ? AND otp= ?',[req.body.take_money_id,req.body.otp],function(err,result2){
                
//             })
//         }
//         res.json({"error":false,"detail":"Completed"})
//     })
// })
    // nexmo.message.sendSms(
    // 'NEXMO', 919993993223, 'Yo!',
    //     (err, responseData) => {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         console.dir(responseData);
    //     }
    //     }
    // );
    
app.listen(port, function() {
    console.log('Our app is running on http://localhost:' + port);
});
