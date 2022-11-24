const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require(__dirname + '/modules/db_connect2');
const multer =  require('multer');
const jwt = require('jsonwebtoken');

const app = express();




app.use(cors())
/* ----------在node中需透過multer才可以接到------------ */
app.use(express.json())
app.post(multer().none(),(req,res,next)=>{next()})
/* ------------------------------------------------- */

/* ----------------外送員接單------------------ */

async function getListData(req, res){
    const sql1 = "SELECT shop_order.sid, shop_order.member_sid, shop_order.order_sid, shop_order.shop_sid, shop.name, shop.address FROM shop RIGHT JOIN shop_order on shop.sid = shop_order.shop_sid ";
    [rows1] = await db.query(sql1);
    return {rows1};
}

/* ------------------------------------------ */

/* ----------外送員登入------------ */
app.post('/deliverlogin', async(req, res)=>{
    const output = {
        success: false,
        error: '帳密錯誤',
        postData: req.body,  //除錯用
        auth: {}
    }
    const sql = `SELECT * FROM deliver WHERE email=?`;
    const [rows] = await db.query(sql, [req.body.email]);
    if(!rows.length){
        return res.json(output)  //只執行這一次不會返回重跑
    }
    const row = rows[0];
    console.log(row);
    output.success = await bcrypt.compare(req.body.password, row['password']); 
    if(output.success){
        output.error = '';  
        const {sid, name, online_status} = row;   //這裡是key
        const token = jwt.sign({sid,name,online_status}, 'lkasdjglkdfjl');  //這裡是value(想用這個不行process.env.JWT_SECRET)
        output.auth = {
            sid,
            name,
            token,
        }    
    }   
    res.json(output);
})
/* ----------------------------- */

/* ----------外送員接單------------ */
app.get('/api', async (req, res)=>{
    res.json(await getListData(req, res));
});
/* ----------------------------- */
/* ----------外送員訂單確認------------ */
app.post('/sendOrder', async (req, res)=>{
    const sqlenter = "INSERT INTO `deliver_order`(`deliver_order_sid`, `member_sid`, `shop_sid`, `deliver_sid`, `store_order_sid`, `order_sid`, `order_finish`, `deliver_fee`, `deliver_memo`, `deliver_check_time`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    const [result] = await db.query(sqlenter, [req.body.deliver_order_sid, req.body.member_sid, req.body.shop_sid, req.body.deliver_sid, req.body.store_order_sid, req.body.order_sid, req.body.order_finish, req.body.deliver_fee, req.body.deliver_memo]);
    res.json(result);
})
/* --------------------------------- */
/* ----------接單後訂單預覽------------- */
app.get('/deliverorder/:id', async(req, res)=>{
    const sql1 ="SELECT member.name,  shop.name AS shopname, shop.address, shop.phone, member.name, deliver_order.deliver_memo,  deliver_order.deliver_fee, deliver_order.order_sid FROM (deliver_order INNER JOIN shop ON deliver_order.shop_sid = shop.sid) INNER JOIN member ON deliver_order.member_sid = member.sid WHERE order_sid = ?";
    const [rows] = await db.query(sql1, [req.params.id]);
    const sql2 ="SELECT products.name, products.price, order_detail.amount FROM (order_detail INNER JOIN products ON order_detail.product_sid = products.sid ) WHERE order_detail.order_sid = ?";
    const [food] = await db.query(sql2, [req.params.id]);
    res.json({rows,food});
})
/* ---------------------------------- */
/* ----------接單後訂單取餐鈕----------- */
app.put('/deliverorder11/:id', async(req, res)=>{
    const sql = "UPDATE deliver_order SET `deliver_take_time`=NOW() WHERE order_sid=?";
    const [result] = await db.query(sql, [
        req.params.sid
    ]);
    res.json(result);
})
/* ---------------------------------- */
/* --------------過往紀錄------------- */
app.get('/dataslist/:id', async(req, res)=>{
    const sql = "SELECT deliver_order.order_sid, deliver_order.deliver_order_sid, shop.name AS shopname, shop.address, deliver_fee, member.name, deliver_order.deliver_check_time, deliver_order.deliver_take_time, deliver_order.complete_time FROM( deliver_order INNER JOIN member ON deliver_order.member_sid = member.sid) INNER JOIN shop ON deliver_order.shop_sid = shop.sid WHERE deliver_order.order_finish = 1 AND deliver_order.deliver_sid = ?";
    const [listrow] = await db.query(sql,[req.params.id]);
    res.json(listrow);
})
/* ---------------------------------- */
/* -----------過往紀錄菜單------------- */
app.get('/foodmeun/:id', async(req, res)=>{
    const sql ="SELECT products.name, products.price, order_detail.amount FROM (order_detail INNER JOIN products ON order_detail.product_sid = products.sid ) WHERE order_detail.order_sid = ?";
    const [food] = await db.query(sql, [req.params.id]);
    res.json(food);
})
/* ---------------------------------- */





/* --------取得外送員sid(test)--------- */
app.post('/deliver/:sid', async(req, res)=>{
    const sql = "SELECT * FROM deliver WHERE sid=?";
    const [rows] = await db.query(sql, [req.params.sid]);
    res.json(rows);
})

/* ----------------------------- */

app.use('/edit/:sid', async(req, res)=>{
    const sql = "SELECT * FROM shop_order WHERE sid=?";
    const [rows] = await db.query(sql, [req.params.sid]);
    res.json(rows);
})

app.use('/edit/:sid', async(req, res)=>{
    const sql = "SELECT * FROM shop_order WHERE sid=?";
    const [rows] = await db.query(sql, [req.params.sid]);
    res.json(rows);
})
app.put('/edit/:sid', async(req, res)=>{
    const output = {
        success: false,
        code: 0,
        error: {},
        postData: req.body, // 除錯用
    };

    const sql = "UPDATE `shop_order` SET `deliver_sid`=?,`deliver_order_sid`=? WHERE `sid`=?";
    const [result] = await db.query(sql, [
        req.body.deliver_sid,
        req.body.deliver_order_sid,
        req.params.sid
    ]);

    console.log(result);
})



// app.get('/try-db/:sid', async (req, res)=>{
//     //修改member_sid的數字去抓客戶的所有訂單
//     const sql = "SELECT * FROM orders WHERE `member_sid`=?";
//     const [rows] = await db.query(sql, [req.params.sid]);
//     res.json(rows);
// });

const port = 3005;
app.listen(port, ()=>{
    console.log(`server port ${port}`)
})