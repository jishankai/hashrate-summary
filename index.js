/*
module.exports = function(deployer) {
  // Use deployer to state migration tasks.
};
*/
const axios = require('axios');
const sendgrid = require('@sendgrid/mail');
require('dotenv').config();
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
 service: 'gmail',
 auth: {
   user: process.env.GMAIL_ADDRESS,
   pass: process.env.GMAIL_PWD,
 }
});
const AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';
AWS.config.update({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
});

const sns = new AWS.SNS();
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

async function run() {
  let str = `Summarize Start: ${new Date(Date.now())}…………\n`;
  console.log(str);
  const stats = await axios.get('https://mainnet.quarkchain.io/getFullStats');
  const rootHeight = stats.data.rootHeight;
  const rootLastBlockTime = stats.data.rootLastBlockTime;
  if(rootLastBlockTime>600) {
    const phones = process.env.QKC_PHONELIST.split(',');
    for(let phone of phones) {
      await sns.publish({
        Message: "根链算力异常[QuarkChain Mining]",
        MessageStructure: 'string',
        PhoneNumber: phone,
        Subject: 'ALERT'
      });
    }
  }
  const date = new Date();
  //北京时间10:00~10:10间执行
  if(date.getHours()==2 && date.getMinutes()<10) {
    let check0x32 = false;
    let check0x2b = false;
    let check0xfc = false;
    for(let h = rootHeight; rootHeight - h < 512; h--) {
      const res = await axios.post('http://jrpc.mainnet.quarkchain.io:38391',{
        "jsonrpc": "2.0",
        "method": "getRootBlockByHeight",
        "params": ["0x"+h.toString(16)],
        "id": 1
      });
      const root = res.data.result;
      if(root.miner.slice(0,4)=='0x32' && !check0x32) {
        check0x32 = true;
        str = str + '\n' + `根链高度${Number(root.height)}, 当前难度${('00'+(root.difficulty/10e11).toFixed(7)).slice(-12)}T, 0x32地址出块数${('000'+Number(root.poswMinedBlocks)).slice(-3)}/512, 出块比例${('000'+(root.poswMinedBlocks*100/512).toFixed(2)).slice(-5)}%, 算力${('00000'+(root.difficulty/60/10000/512*root.poswMinedBlocks/10e5).toFixed(2)).slice(-7)}M`;
      } else if(root.miner.slice(0,4)=='0xfc' && !check0xfc) {
        check0xfc = true;
        str = str + '\n' + `根链高度${Number(root.height)}, 当前难度${('00'+(root.difficulty/10e11).toFixed(7)).slice(-12)}T, 0xfc地址出块数${('000'+Number(root.poswMinedBlocks)).slice(-3)}/512, 出块比例${('000'+(root.poswMinedBlocks*100/512).toFixed(2)).slice(-5)}%, 算力${('00000'+(root.difficulty/60/10000/512*root.poswMinedBlocks/10e5).toFixed(2)).slice(-7)}M`;
      } else if(root.miner.slice(0,4)=='0x2b' && !check0x2b) {
        check0x2b = true;
        str = str + '\n' + `根链高度${Number(root.height)}, 当前难度${('00'+(root.difficulty/10e11).toFixed(7)).slice(-12)}T, 0x2b地址出块数${('000'+Number(root.poswMinedBlocks)).slice(-3)}/512, 出块比例${('000'+(root.poswMinedBlocks*100/512).toFixed(2)).slice(-5)}%, 算力${('00000'+(root.difficulty/60/1000/512*root.poswMinedBlocks/10e5).toFixed(2)).slice(-7)}M`;
      }

      if(check0x32 && check0xfc && check0x2b) {
        str += '\n';
        break;
      }
    }
    for(let k in stats.data.shards) {
      const shard = stats.data.shards[k];
      const shardx = await axios.post('http://jrpc.mainnet.quarkchain.io:38391',{
        "jsonrpc": "2.0",
        "method": "getAccountData",
        "params": ["0x7DeB90eF2097D8A9e423516e199b9D95EB2b4D97000"+k+"0001", "latest", true],
        "id": 1
      });

      const mined = shardx.data.result.primary.minedBlocks;
      if(k==0) {
        str = str + '\n' + `分片${k}高度${shard.height}, 当前难度${('00'+(shard.difficulty/10e8).toFixed(6)).slice(-10)}G, 0x7d地址出块数${('000'+Number(mined)).slice(-3)}/256, 出块比例${('000'+(mined*100/256).toFixed(2)).slice(-5)}%, 算力${('00000'+(shard.difficulty/10/256*mined/10e5).toFixed(2)).slice(-7)}M`;
      } else if(k<6) {
        str = str + '\n' + `分片${k}高度${shard.height}, 当前难度${('00'+(shard.difficulty/10e8).toFixed(6)).slice(-10)}G, 0x7d地址出块数${('000'+Number(mined)).slice(-3)}/256, 出块比例${('000'+(mined*100/256).toFixed(2)).slice(-5)}%, 算力${('00000'+(shard.difficulty/10/20/256*mined/10e5).toFixed(2)).slice(-7)}M`;
      } else {
        str = str + '\n' + `分片${k}高度${shard.height}, 当前难度${('00'+(shard.difficulty/10e8).toFixed(6)).slice(-10)}G, 0x7d地址出块数${('000'+Number(mined)).slice(-3)}/256, 出块比例${('000'+(mined*100/256).toFixed(2)).slice(-5)}%, 算力${('00000'+(shard.difficulty/10/20/256*mined/1000).toFixed(2)).slice(-7)}K`;
      }
    }

    str = str + '\n\n' + `…………Summarize Finished: ${new Date(Date.now())}`;

    const mailOptions = {
      from: 'QuarkChain Mining<mining@quarkchain.org>', // sender address
      to: process.env.QKC_EMAILLIST,
      subject: `QKC Miners' Hashrate Summary ${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      html: str,
    };
    transporter.sendMail(mailOptions, function (err, info) {
      if(err)
        console.log(err);
      else
        console.log(info);
    });
    console.log(str);
  }
  console.log('...Finished');
}

run();
