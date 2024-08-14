const latestDeployments = require("../deployments/latest.json");

console.log([
  `PRIZE_MANAGER_CONTRACT=${latestDeployments[0].address}`,
  `TICKET_MANAGER_CONTRACT=${latestDeployments[2].address}`,
  `TICKET_CONTRACT=${latestDeployments[1].address}`,
].join('\n'));