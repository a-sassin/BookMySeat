const allowedEnvs = ['prod', 'demo', 'dev'];
const env = allowedEnvs.includes(process.env.ENVIRONMENT)
    ? process.env.ENVIRONMENT
    : 'local';
const envPath = `./environments/.env.${env}`;

const setEnvVariables = () =>
    require('dotenv').config({
        path: envPath,
    });

module.exports = setEnvVariables;