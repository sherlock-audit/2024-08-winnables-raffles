const { spawn } = require('child_process');
const {wait} = require('./helpers');

class HardhatNode {
  constructor(port) {
    this.node = spawn('npx', ['hardhat', 'node', '--hostname', 'localhost', '--port', port]);

    this.node.on('close', () => {
      this.killed = true;
    });
    this.killed = false;
  }

  stop() {
    const p = new Promise(async (r) => {
      while (true) {
        if (this.killed) r();
        await wait(500);
      }
    })
    this.node.stdin.end();
    this.node.stdout.destroy();
    this.node.stderr.destroy();
    this.node.kill();
    return p;
  }
}

module.exports = HardhatNode;
