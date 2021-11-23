/*
module.exports = function(deployer) {
  // Use deployer to state migration tasks.
};
*/
const axios = require('axios');
const sendgrid = require('@sendgrid/mail');
const Yuntongxun = require('yuntongxun-sdk');
const yuntongxun = new Yuntongxun({
  urlPrefix: 'https://app.cloopen.com:8883',
  version: '2013-12-26',
  accountSid: '8aaf0708559f32dd0155a5edcef40759',
  authToken: '2ca3bf2ecee4445d930dfb3d8dcc3324',
  appId: '8aaf0708559f32dd0155a6376c6907d0'
});

require('dotenv').config();
const AWS = require('aws-sdk');
AWS.config.update({
  region: 'us-west-2',
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
  const rootTimestamp = stats.data.rootTimestamp;
  const rootLastBlockTime = parseInt(Date.now()/1000) - rootTimestamp;
  if(rootLastBlockTime>600) {
    const phones = process.env.QKC_PHONELIST.split(',');
    for(let phone of phones) {
      yuntongxun.templateSms(phone, '1', [`*算力异常，高度${rootHeight}*`,`**上次出块${rootLastBlockTime}秒前**`]).then((callSid) => {
        console.log(callSid);
      }, (err) => {
        console.error(err);
      });
    //   let params = {
    //     Message:`根链算力异常, 高度${rootHeight}，上次出块${rootLastBlockTime}秒前[QuarkChain Mining]`,
    //     MessageStructure: 'string',
    //     PhoneNumber: phone,
    //     Subject: 'ALERT'
    //   };
    //   var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise();
    //   publishTextPromise.then(
    //     function(data) {
    //       console.log("MessageID is " + data.MessageId);
    //     }).catch(
    //       function(err) {
    //         console.error(err, err.stack);
    //       }
    //     );
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
        str = str + '\n' + `根链高度${Number(root.height)}, 当前难度${('00'+(root.difficulty/10e11).toFixed(7)).slice(-12)}T, 0x32地址出块数${('000'+Number(root.poswMinedBlocks)).slice(-3)}/512, 出块比例${('000'+(root.poswMinedBlocks*100/512).toFixed(2)).slice(-6)}%, 算力${('00000'+(root.difficulty/60/10000/512*root.poswMinedBlocks/10e5).toFixed(2)).slice(-7)}M`;
      } else if(root.miner.slice(0,4)=='0xfc' && !check0xfc) {
        check0xfc = true;
        str = str + '\n' + `根链高度${Number(root.height)}, 当前难度${('00'+(root.difficulty/10e11).toFixed(7)).slice(-12)}T, 0xfc地址出块数${('000'+Number(root.poswMinedBlocks)).slice(-3)}/512, 出块比例${('000'+(root.poswMinedBlocks*100/512).toFixed(2)).slice(-6)}%, 算力${('00000'+(root.difficulty/60/10000/512*root.poswMinedBlocks/10e5).toFixed(2)).slice(-7)}M`;
      } else if(root.miner.slice(0,4)=='0x2b' && !check0x2b) {
        check0x2b = true;
        str = str + '\n' + `根链高度${Number(root.height)}, 当前难度${('00'+(root.difficulty/10e11).toFixed(7)).slice(-12)}T, 0x2b地址出块数${('000'+Number(root.poswMinedBlocks)).slice(-3)}/512, 出块比例${('000'+(root.poswMinedBlocks*100/512).toFixed(2)).slice(-6)}%, 算力${('00000'+(root.difficulty/60/1000/512*root.poswMinedBlocks/10e5).toFixed(2)).slice(-7)}M`;
      }

      if(check0x32 && check0xfc && check0x2b) {
        str += '\n';
        break;
      }
    }
    /*
    if(!check0xfc) {
      const phones = process.env.QKC_PHONELIST.split(',');
      for(let phone of phones) {
        let params = {
          Message:`根链算力异常, 0xfc长时间未出块[QuarkChain Mining]`,
          MessageStructure: 'string',
          PhoneNumber: phone,
          Subject: 'ALERT'
        };
        publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise();
        publishTextPromise.then(
          function(data) {
            console.log("MessageID is " + data.MessageId);
          }).catch(
            function(err) {
              console.error(err, err.stack);
            }
          );
      }
    }
    */
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

    msg = {
      to: process.env.QKC_EMAILLIST.split(','),
      from: 'QuarkChainMining@quarkchain.org',
      subject: `QKC Miners' Hashrate Summary ${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`,
      text: str
    };

    sendgrid.send(msg);
    console.log(str);
  }
  console.log('...Finished');
}

run();
