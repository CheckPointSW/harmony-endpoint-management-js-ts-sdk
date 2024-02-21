# Check Point - Harmony Endpoint Management JS-TS SDK

[![License](https://img.shields.io/github/license/CheckPointSW/harmony-endpoint-management-js-ts-sdk.svg)](https://github.com/CheckPointSW/harmony-endpoint-management-js-ts-sdk/blob/main/LICENSE) [![Latest Release](https://img.shields.io/github/v/release/CheckPointSW/harmony-endpoint-management-js-ts-sdk)](https://github.com/CheckPointSW/harmony-endpoint-management-js-ts-sdk/releases) [![npm version](https://img.shields.io/npm/v/@chkp/harmony-endpoint-management-sdk.svg?style=flat)](https://www.npmjs.com/package/@chkp/harmony-endpoint-management-sdk)

<!-- 
Coming soon :)

[![npm downloads](https://img.shields.io/npm/dt/@chkp/harmony-endpoint-management-sdk.svg.svg?style=flat)](https://npmjs.com/package/@chkp/harmony-endpoint-management-sdk.svg)

[![GitHub stars](https://img.shields.io/github/stars/CheckPointSW/harmony-endpoint-management-js-ts-sdk.svg?style=social&label=Star)](https://github.com/CheckPointSW/harmony-endpoint-management-js-ts-sdk/stargazers) -->

[![Build SDK Package](https://github.com/CheckPointSW/harmony-endpoint-management-js-ts-sdk/actions/workflows/build.yml/badge.svg)](https://github.com/CheckPointSW/harmony-endpoint-management-js-ts-sdk/actions/workflows/build.yml) [![Publish Package to npmjs](https://github.com/CheckPointSW/harmony-endpoint-management-js-ts-sdk/actions/workflows/release.yml/badge.svg)](https://github.com/CheckPointSW/harmony-endpoint-management-js-ts-sdk/actions/workflows/release.yml)


This is the Harmony Endpoint management SDK for JavaScript ecosystem.

The SDK is based on the public [Harmony Endpoint management OpenAPI](https://app.swaggerhub.com/apis/Check-Point/web-mgmt-external-api-production) specifications.

The SDK fully supports TypeScript interfaces in parameters and responses.

With the SDK, you do not have to manage log in, send keep alive requests, worry about session expiration or pull long processing jobs.

> 💡 The Harmony Endpoint SDK supports simultaneous instances with different tenants.

---
🚧🚧🚧 

**Note that the SDK package is in Early Availability (EA). Use with caution, as it may undergo changes and improvements. Feedback and contributions are highly encouraged.** 

To report a bug, please go to [Report Bug](#-report-bug)

For feedback, please get in touch with us at [Check Point Software Technologies Ltd.](mailto:harmony-endpoint-external-api@checkpoint.com)

🚧🚧🚧 

---

## ⬇️ SDK installation

To start using this SDK, add the SDK package to your project

Via yarn
```
yarn add @chkp/harmony-endpoint-management-sdk
```
Or using good old npm
```
npm install @chkp/harmony-endpoint-management-sdk
```

## 🚀 Getting started

First, import the `HarmonyEndpoint` object from the package.

```typescript
import { HarmonyEndpoint } from "@chkp/harmony-endpoint-management-sdk";
```

Then, create a new instance of `HarmonyEndpoint`, which provides CloudInfra API credentials and a gateway to connect to.

To obtain CloudInfra credentials, open the Infinity Portal and create a suitable API Key. Make sure to select `Endpoint` in the `Service` field. For more information, see [Infinity Portal Administration Guide](https://sc1.checkpoint.com/documents/Infinity_Portal/WebAdminGuides/EN/Infinity-Portal-Admin-Guide/Content/Topics-Infinity-Portal/API-Keys.htm?tocpath=Global%20Settings%7C_____7#API_Keys).

Once the Client ID, Secret Key, and Authentication URL are obtained, Harmony Endpoint SDK can be used.

All API operations can be explored with the `HarmonyEndpoint` instance.

All API's can be also explored in [SwaggerHub](https://app.swaggerhub.com/apis/Check-Point/web-mgmt-external-api-production)

A complete example:

```typescript
import { HarmonyEndpoint, HarmonyResponse, EndpointInterfaces } from "@chkp/harmony-endpoint-management-sdk";

// Create a new instance of HarmonyEndpoint (we do support multiple instances in parallel)
const he: HarmonyEndpoint = new HarmonyEndpoint();

// Connect to management using CloudInfra API credentials
await he.connect({ 
        clientId: "place here the CI client-id", // The "Client ID"
        accessKey: "place here the CI access-key", // The "Secret Key"
        gateway: "https://cloudinfra-gw-us.portal.checkpoint.com/auth/external", // The "Authentication URL"
    });

// Query the API operation
const rulesMetadataRes: HarmonyResponse<Array<EndpointInterfaces.RuleMetadata>> = await he.PolicyGeneralApi.getAllRulesMetadata(EndpointInterfaces.RunAsJob.Off);
console.log(rulesMetadataRes.payload); // Your rulebase metadata

// Also you can query this operation using a job, no extra logic is required, in the background, it will trigger a job and will pull the status till it is finished and return the final results.
const rulesMetadataJobRes: HarmonyResponse<Array<EndpointInterfaces.RuleMetadata>> = await he.PolicyGeneralApi.getAllRulesMetadata(EndpointInterfaces.RunAsJob.On);
console.log(rulesMetadataJobRes.isJob); // true
console.log(rulesMetadataJobRes.payload); // Your rulebase metadata, same as in non-job operation

// After you finish, disconnect to stop all background session management. 
await he.disconnect(); 
```



### 🏠 On-premise

🛠️🛠️🛠️ **Under Development** 🛠️🛠️🛠️

Harmony Endpoint On-premise instances are also supported.

> Pay attention! Not all cloud operations are available for on-premise, also need to specify the SDK version to comply with your Gaia / JHF version


```typescript
import { EndpointPremiseInterfaces, HarmonyEndpointPremise } from "@chkp/harmony-endpoint-management-sdk";

// Create a new instance of HarmonyEndpoint (we do support multiple instances in parallel)
const hbp = new HarmonyEndpointPremise();

// Connect to management using CheckPoint Management credentials
await hbp.connect({
		username: 'xxxx',
		password: 'xxxx',
		url: 'https://x.x.x.x',
		disableTLSChainValidation: false, // Set it true only if you fully trust this URL (e.g. case of internal but not verified https certificate)
	});

// Query the API operation
const rulesMetadataRes: HarmonyResponse<Array<EndpointPremiseInterfaces.RuleMetadata>> = await hbp.PolicyGeneralApi.getAllRulesMetadata(EndpointPremiseInterfaces.RunAsJob.Off);
console.log(rulesMetadataRes.payload); // Your rulebase metadata

```

On-Premises API can be explored in [SwaggerHub](https://app.swaggerhub.com/apis/Check-Point/web-mgmt-external-api-premise)

### ☁️ Cloud & MSSP services APIs

Harmony Endpoint also provides APIs for MSSP and Cloud service management (relevant to SaaS customers only) 


The usage is similar to the management API
```typescript
import { HarmonyEndpointSaaS, EndpointSaaSInterfaces } from "@chkp/harmony-endpoint-management-sdk";

// Create a new instance of HarmonyEndpointSaaS (we do support multiple instances in parallel)
const heSaas: HarmonyEndpointSaaS = new HarmonyEndpointSaaS();

// Connect to service using CloudInfra API credentials
await heSaas.connect({
        clientId: "place here your CI client-id", // The "Client ID"
        accessKey: "place here your CI access-key", // The "Secret Key"
        gateway: 'https://cloudinfra-gw-us.portal.checkpoint.com/auth/external', // The "Authentication URL"
    }, {
		activateMssPSession: false, // Activate MSSP's session management, turn on if you're using MSSP APIs
	});

// Query the cloud API operation
const instanceStatusRes: HarmonyResponse<EndpointSaaSInterfaces.PublicMachineStatusResponse> = await heSaas.SelfServiceApi.publicMachinesSingleStatus();
console.log(instanceStatusRes.payload); // Your instance status

// After you finish, disconnect to stop all background session management. 
await heSaas.disconnect(); 
```

API available at [SwaggerHub](https://app.swaggerhub.com/apis/Check-Point/harmony-endpoint-cloud-api-prod)


##  📦 Versioning

While using cloud services, it's recommended to constantly update to the latest published SDK version.

For on-premises, it's recommended to align the versions of the SDK and the Harmony Endpoint Management service.

You can view the matching SDK's pulling command from the Harmony Endpoint Web Management Portal - `Settings` > `API & SDKs`.

The command will be similar to:
```
yarn add @chkp/harmony-endpoint-management-sdk@1.0.11-JHF-R81_20_JHF_DEV_T154
```

## 🔍 Troubleshooting and logging

The full version and build info of the SDK is available by `HarmonyEndpoint.info()` see example:
```typescript
import { HarmonyEndpoint, HarmonyEndpointSDKInfo } from "@chkp/harmony-endpoint-management-sdk";

const sdkInfo: HarmonyEndpointSDKInfo = HarmonyEndpoint.info();
console.log(sdkInfo): // { sdkBuild: '9728283', spec: 'web-mgmt-external-api-production', specVersion: '1.9.159', releasedOn: '2023-09-10T18:14:38.264Z', sdkVersion: '1.0.2' }
```


Harmony Endpoint Management SDK uses [debug](https://www.npmjs.com/package/debug) package for logging, which makes it very easy to enable and disable logs

There are 3 loggers, for general info, errors and to inspect the network.

To enable all, set (or append) to the `DEBUG` environment variable the following string:
```bash
DEBUG="harmony-endpoint-management:*"
```

For a specific logger as follows:
```bash
DEBUG="harmony-endpoint-management:info"
DEBUG="harmony-endpoint-management:error"
DEBUG="harmony-endpoint-management:network"
```

## 🐞 Report Bug

In case of an issue or a bug found in the SDK, please open an [issue](https://github.com/CheckPointSW/harmony-endpoint-management-js-ts-sdk/issues) or report to us [Check Point Software Technologies Ltd](mailto:harmony-endpoint-external-api@checkpoint.com).

## 🤝 Contributors 
- Haim Kastner - [chkp-haimk](https://github.com/chkp-haimk)
- Yuval Pomerchik - [chkp-yuvalpo](https://github.com/chkp-yuvalpo)
- Oren Efraim - [chkp-orenef](https://github.com/chkp-orenef)