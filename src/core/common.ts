import { Duration } from 'unitsnet-js';
import { HarmonyError, HarmonyErrorScope } from '../interfaces/infra';
import { networkLogger, errorLogger } from './debug.logger';
import { HarmonyRequestSession } from '../interfaces/core';

export async function sleep(duration: Duration) {
	return new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve();
		}, duration.Milliseconds);
	});
}

export async function parseFetchError(error: any, harmonyRequestSession?: HarmonyRequestSession): Promise<HarmonyError> {
	if (error?.success === false) {
		errorLogger(`Receiving CloudInfra error: "${JSON.stringify(error)}"`);
		networkLogger(`Receiving CloudInfra error: "${JSON.stringify(error)}"`);
		return {
			errorScope: HarmonyErrorScope.SESSION,
			networkError: error,
			message: 'CloudInfra Gateway rejection',
		} as HarmonyError;
	}

	if (error.errno) {
		errorLogger(`Receiving communication error "${JSON.stringify(error)}"`);
		networkLogger(`Receiving communication error: "${JSON.stringify(error)}"`);
		return {
			errorScope: HarmonyErrorScope.NETWORKING,
			networkError: error,
			requestId: harmonyRequestSession?.requestId,
		} as HarmonyError;
	}

	const statusCode = error?.status;
	const statusText = error?.statusText;
	const url = error?.url;
	const textBody = await error?.text?.();
	let body = { textBody } as any;
	try {
		body = JSON.parse(textBody);
		// eslint-disable-next-line no-empty
	} catch (parseError) {}
	errorLogger(
		`Receiving error "${url}" "${JSON.stringify({
			body,
			status: statusCode,
		})}`
	);
	networkLogger(
		`Receiving error "${url}" with options: "${JSON.stringify({
			body,
			status: statusCode,
			headers: error?.headers?.raw?.(),
		})}"`
	);
	return {
		errorScope: HarmonyErrorScope.SERVICE,
		requestId: harmonyRequestSession?.requestId,
		payloadError: body,
		url,
		statusCode,
		statusText,
	} as HarmonyError;
}
