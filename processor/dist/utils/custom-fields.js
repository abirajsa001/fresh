"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCustomTypes = exports.createOrderPaymentCommentsType = exports.createTransactionCommentsType = exports.apiRoot = void 0;
const sdk_client_v2_1 = require("@commercetools/sdk-client-v2");
const platform_sdk_1 = require("@commercetools/platform-sdk");
const config_1 = require("../config/config");
const authOptions = {
    host: config_1.config.authUrl,
    projectKey: config_1.config.projectKey,
    credentials: {
        clientId: config_1.config.clientId,
        clientSecret: config_1.config.clientSecret,
    },
};
const httpOptions = {
    host: config_1.config.apiUrl,
};
const ctpClient = new sdk_client_v2_1.ClientBuilder()
    .withClientCredentialsFlow(authOptions)
    .withHttpMiddleware(httpOptions)
    .build();
exports.apiRoot = (0, platform_sdk_1.createApiBuilderFromCtpClient)(ctpClient).withProjectKey({
    projectKey: config_1.config.projectKey,
});
const createTransactionCommentsType = async () => {
    try {
        await exports.apiRoot
            .types()
            .withKey({ key: "novalnet-custom-field" })
            .get()
            .execute();
        return;
    }
    catch (err) {
        console.error("Failed to check transaction comment type", err);
    }
    await exports.apiRoot.types().post({
        body: {
            key: "novalnet-custom-field",
            name: { en: "Novalnet Transaction Comments" },
            resourceTypeIds: ["transaction"],
            fieldDefinitions: [
                {
                    name: "transactionComments",
                    label: { en: "Transaction Comments" },
                    type: { name: "String" },
                    required: false,
                },
            ],
        },
    }).execute();
};
exports.createTransactionCommentsType = createTransactionCommentsType;
const createOrderPaymentCommentsType = async () => {
    try {
        await exports.apiRoot
            .types()
            .withKey({ key: "order-payment-comments" })
            .get()
            .execute();
        return;
    }
    catch (err) {
        console.error("Failed to check order payment comments", err);
    }
    await exports.apiRoot.types().post({
        body: {
            key: "order-payment-comments",
            name: { en: "Order Payment Comments" },
            resourceTypeIds: ["order"],
            fieldDefinitions: [
                {
                    name: "paymentComments",
                    label: { en: "Payment Comments" },
                    type: { name: "String" },
                    required: false,
                },
            ],
        },
    }).execute();
};
exports.createOrderPaymentCommentsType = createOrderPaymentCommentsType;
const initCustomTypes = async () => {
    await (0, exports.createTransactionCommentsType)();
    await (0, exports.createOrderPaymentCommentsType)();
};
exports.initCustomTypes = initCustomTypes;
