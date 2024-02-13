/* eslint-disable @typescript-eslint/no-unused-expressions */
import { describe } from 'mocha';
import { he, heSaas } from '../global.spec';
import { EndpointInterfaces } from '../../src/index';

describe('# SDK Cloud Uses', () => {
	it('Job Off', async () => {
		await he.PolicyGeneralApi.getAllRulesMetadata(EndpointInterfaces.RunAsJob.Off);
	});
	it('Job with payload ON', async () => {
		await he.PolicyGeneralApi.getAllRulesMetadata(EndpointInterfaces.RunAsJob.On);
	});
	it('Operation W/O Job ', async () => {
		await he.PolicyGeneralApi.installAllPolicies(EndpointInterfaces.RunAsJob.Off);
	});
	it('Operation With Job ', async () => {
		await he.PolicyGeneralApi.installAllPolicies(EndpointInterfaces.RunAsJob.On);
	});
});

describe('# SDK SaaS Uses', () => {
	it('Some API', async () => {
		await heSaas.SelfServiceApi.publicMachinesSingleStatus();
	});
});
