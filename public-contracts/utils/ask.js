const readline = require('readline');

/**
 * @param q
 * @return {Promise<string>}
 */
function ask(q) {
  return new Promise(r => {
    const interface = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    interface.question(q, response => {
      interface.close();
      r(response);
    });
  });
}

module.exports = ask;
