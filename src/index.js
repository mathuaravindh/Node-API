const express = require('express')
const sql = require('mssql');
const cors = require('cors');

const app = express()
const port = 3000;

app.use(express.json());
app.use(cors({
    origin: '*'
}));
app.get('/gethealth', (req, res) => { 
     res.send('Health Check!')
    })

app.post('/GetTaskCount',async (req,res) => {
try {
    var conn = await getConn();
    var result = {};
    var queryResult = await conn.query(`select ak.AssetID,ak.AssetTaskID,[Type] =  CASE    
    WHEN DATEDIFF(day, GETDATE(), ak.WarnTime) >= 0 THEN 'Upcoming'    
    WHEN (ak.WarnTime IS NULL OR DATEDIFF(day, GETDATE(), ak.WarnTime) < 0) AND DATEDIFF(day, GETDATE(), ak.DueTime) >= 0 THEN 'Warning'    
    WHEN DATEDIFF(day, GETDATE(), ak.DueTime) < 0 THEN 'PastDue'    
    ELSE NULL
    END from Assettask ak 
  where ak.statusid = 788 and ak.userid = (select userid from [user] where userguid = '${req.body.userGuid}')
  union
  select ak.AssetID,aq.AssetTaskID,[Type] =  CASE    
    WHEN DATEDIFF(day, GETDATE(), aq.WarnTime) >= 0 THEN 'Upcoming'    
    WHEN (aq.WarnTime IS NULL OR DATEDIFF(day, GETDATE(), aq.WarnTime) < 0) AND DATEDIFF(day, GETDATE(), aq.DueTime) >= 0 THEN 'Warning'    
    WHEN DATEDIFF(day, GETDATE(), aq.DueTime) < 0 THEN 'PastDue'    
    ELSE NULL
    END from ApprovalQueue aq join AssetTask ak on aq.AssetTaskId = ak.AssetTaskId
  where aq.DateComplete IS NULL and aq.userid = (select userid from [user] where userguid = '${req.body.userGuid}')`);

result.upcomingCount = queryResult.recordset.filter(x => {
    return x.Type === "Upcoming"
    }).length;
result.warningCount = queryResult.recordset.filter(x => {
    return x.Type === "Warning"
    }).length;
result.pastdueCount = queryResult.recordset.filter(x => {
    return x.Type === "PastDue"
    }).length;
result.totalCount = queryResult.recordset.length;
res.send(result);
}
catch(e)
{
    res.send({status: 500, body: {message: "Failed", error: e.message}});
}
})
    
app.post('/TaskAction',async (req,res) => {
try{
    var conn = await getConn();
    if(req.body.action === "Approve")
        await conn.query(`update assettask set statusid = 789 where assettaskid = ${req.body.assettaskid}`);
    else if(req.body.action === "Reject")
    {
        await conn.query(`delete from approvalqueue where assettaskid = ${req.body.assettaskid}`);
        await conn.query(`update assettask set statusid = 788 where assettaskid = ${req.body.assettaskid}`);
    }
    res.send({statusCode:200, message:"Successfully completed the action!", data:null});
}
catch(e)
{
    res.send({status: 500, body: {message: "Failed", error: e.message}});
}
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})

const getConn = async () => {
    await sql.connect('Server=misql-xm-cascade-dev-cus.331c5123c6d7.database.windows.net;Database=CascadeTransactions;User Id=REOUser;Password=Solut10nSt@r;Encrypt=true');
    return sql;
}

// {
//     "userGuid":"922345E1-73CF-45E9-A121-4A741798852C"
//     }