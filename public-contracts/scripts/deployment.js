const latestDeployments = require("../deployments/latest.json");

console.log(latestDeployments.reduce((a, c) => ({
  ...a,
  [c.name]: `${c.network}: ${c.address}`,
}), {}));