/*
module.exports = function(deployer) {
  // Use deployer to state migration tasks.
};
*/
const axios = require('axios');

async function run() {
  console.log(`***********************Summarize Start: ${new Date(Date.now())}****************************`);
  const stats = await axios.get('https://mainnet.quarkchain.io/getFullStats');
  const rootHeight = stats.data.rootHeight;
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
      console.log(`根链高度${Number(root.height)}, 当前难度${('00'+(root.difficulty/10e8).toFixed(6)).slice(-14)}G, 0x32地址出块数${('000'+Number(root.poswMinedBlocks)).slice(-3)}/512, 出块比例${('000'+(root.poswMinedBlocks*100/512).toFixed(2)).slice(-5)}%, 算力${('00000'+(root.difficulty/60/10000/512*root.poswMinedBlocks/1000).toFixed(2)).slice(-10)}K`);
    } else if(root.miner.slice(0,4)=='0xfc' && !check0xfc) {
      check0xfc = true;
      console.log(`根链高度${Number(root.height)}, 当前难度${('00'+(root.difficulty/10e8).toFixed(6)).slice(-14)}G, 0xfc地址出块数${('000'+Number(root.poswMinedBlocks)).slice(-3)}/512, 出块比例${('000'+(root.poswMinedBlocks*100/512).toFixed(2)).slice(-5)}%, 算力${('00000'+(root.difficulty/60/10000/512*root.poswMinedBlocks/1000).toFixed(2)).slice(-10)}K`);
    } else if(root.miner.slice(0,4)=='0x2b' && !check0x2b) {
      check0x2b = true;
      console.log(`根链高度${Number(root.height)}, 当前难度${('00'+(root.difficulty/10e8).toFixed(6)).slice(-14)}G, 0x2b地址出块数${('000'+Number(root.poswMinedBlocks)).slice(-3)}/512, 出块比例${('000'+(root.poswMinedBlocks*100/512).toFixed(2)).slice(-5)}%, 算力${('00000'+(root.difficulty/60/1000/512*root.poswMinedBlocks/1000).toFixed(2)).slice(-10)}K`);
    }

    if(check0x32 && check0xfc && check0x2b) {
      console.log('');
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
    console.log(`分片${k}高度${shard.height}, 当前难度${('00'+(shard.difficulty/10e8).toFixed(6)).slice(-10)}G, 0x7d地址出块数${('000'+Number(mined)).slice(-3)}/256, 出块比例${('000'+(mined*100/256).toFixed(2)).slice(-5)}%, 算力${('00000'+(shard.difficulty/10/20/256*mined/1000).toFixed(2)).slice(-10)}K`);
  }

  console.log(`***********************Summarize finished: ${new Date(Date.now())}**************************`);
}

run();
