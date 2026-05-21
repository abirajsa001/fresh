"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectApiRoot = void 0;
exports.getApiRoot = getApiRoot;
const sdk_client_v2_1 = require("@commercetools/sdk-client-v2");
const platform_sdk_1 = require("@commercetools/platform-sdk");
const config_1 = require("../config/config");
const logger_2 = require("../libs/logger");
const logger_1 = require("../libs/logger");
logger_1.log.info("logger1 authurl fetched", {
    customerData: String((0, config_1.getConfig)()?.authUrl),
});
logger_2.log.info("logInfo apiUrl fetched", {
    customerDataID: String((0, config_1.getConfig)()?.apiUrl),
});
const projectKey = String((0, config_1.getConfig)()?.projectKey);
const authUrl = String((0, config_1.getConfig)()?.authUrl);
const apiUrl = String((0, config_1.getConfig)()?.apiUrl);
const clientId = String((0, config_1.getConfig)()?.clientId);
const clientSecret = String((0, config_1.getConfig)()?.clientSecret);
const authMiddlewareOptions = {
    host: String((0, config_1.getConfig)()?.authUrl),
    projectKey,
    credentials: {
        clientId: String((0, config_1.getConfig)()?.clientId),
        clientSecret: String((0, config_1.getConfig)()?.clientSecret),
    },
};
const httpMiddlewareOptions = {
    host: String((0, config_1.getConfig)()?.apiUrl),
};
const ctpClient = new sdk_client_v2_1.ClientBuilder()
    .withClientCredentialsFlow(authMiddlewareOptions)
    .withHttpMiddleware(httpMiddlewareOptions)
    .build();
// THIS is your "projectApiRoot"
exports.projectApiRoot = (0, platform_sdk_1.createApiBuilderFromCtpClient)(ctpClient)
    .withProjectKey({ projectKey });
function getApiRoot() {
    const client = new sdk_client_v2_1.ClientBuilder()
        .withProjectKey(projectKey)
        .withClientCredentialsFlow({
        host: authUrl,
        projectKey,
        credentials: { clientId, clientSecret },
        fetch, // global fetch in Node 18+
    })
        .withHttpMiddleware({ host: apiUrl, fetch })
        .build();
    // Must scope API to project key to access resources like orders()
    return (0, platform_sdk_1.createApiBuilderFromCtpClient)(client).withProjectKey({ projectKey });
}
