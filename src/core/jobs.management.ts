import { Duration, DurationUnits } from 'unitsnet-js';
// eslint-disable-next-line import/no-cycle
import { JobStatus } from '../generated/cloud/swagger/api'; // DO NOT IMPORT LOGICAL VARS!!! - This is a cycle import, and it works only due to importing TS interface only, that has no affect on runtime.
import { HarmonyError, HarmonyErrorScope, HarmonyResponse } from '../interfaces/infra';
import { sleep } from './common';
import { JOBS_PULLING_INTERVAL, MAX_FAILED_PULLING_ATTEMPTS } from './sdk.platform';
import { errorLogger, logger } from './debug.logger';

export class JobManager {
	constructor(private jobStatusOperation: (jobId: string) => Promise<HarmonyResponse<JobStatus>>) {}

	public async awaitForJob<T>(operationPayload: HarmonyResponse<T>): Promise<HarmonyResponse<T>> {
		const jobId = operationPayload.jobId || '';
		if (!jobId) {
			const message = `No job provided from service for request "${operationPayload.requestId}"`;
			errorLogger(message);
			throw {
				message,
				errorScope: HarmonyErrorScope.SERVICE,
				requestId: operationPayload.requestId,
			} as HarmonyError;
		}

		logger(`Starting job "${jobId}" pulling process..`);

		const jobStarted = new Date().getTime();
		let jobStatusRes;
		let pullingFailedAttempts = 0;

		// eslint-disable-next-line no-constant-condition
		while (true) {
			await sleep(JOBS_PULLING_INTERVAL);
			logger(`Pulling job "${jobId}" status...`);
			try {
				jobStatusRes = await this.jobStatusOperation(jobId);
				pullingFailedAttempts = 0;
			} catch {
				pullingFailedAttempts++;

				if (pullingFailedAttempts > MAX_FAILED_PULLING_ATTEMPTS) {
					errorLogger(`Pulling job "${jobId}" failed attempt "${pullingFailedAttempts}", aborting pulling`);
					throw {
						errorScope: HarmonyErrorScope.SERVICE,
						requestId: jobStatusRes?.requestId,
						payloadError: jobStatusRes?.payload,
					} as HarmonyError;
				}
				errorLogger(`Pulling job "${jobId}" failed attempt "${pullingFailedAttempts}", will try again in next pulling attempt`);
				// eslint-disable-next-line no-continue
				continue;
			}

			logger(`Job "${jobId}" status is "${jobStatusRes.payload.status}"`);

			if (jobStatusRes.payload.status === 'DONE') {
				break;
			}

			if (jobStatusRes.payload.status === 'NOT_FOUND' || jobStatusRes.payload.status === 'FAILED') {
				const message = `Job "${jobId}" failed with status "${jobStatusRes.payload.status}", error: ${JSON.stringify(jobStatusRes.payload)}`;
				errorLogger(message);
				throw {
					errorScope: HarmonyErrorScope.SERVICE,
					requestId: jobStatusRes.requestId,
					payloadError: jobStatusRes.payload,
				} as HarmonyError;
			}
		}

		const jobEnd = new Date().getTime();

		const duration = Duration.FromMilliseconds(jobEnd - jobStarted);

		logger(`Job "${jobId}" finished successfully after ${duration.toString(DurationUnits.Seconds)}"`);

		return {
			jobId,
			duration,
			payload: jobStatusRes.payload.data,
			isJob: true,
			httpResponse: jobStatusRes.httpResponse,
			requestId: jobStatusRes.requestId,
		};
	}
}
