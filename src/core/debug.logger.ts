import debug from 'debug';
import timestamp from 'time-stamp';
import { APPLICATION_NAME } from './sdk.platform';

const timestampDebug = (namespace: string, color: string) => {
	const logger = debug(namespace);
	logger.color = color;

	return (...args: any[]) => {
		const timestampStr = timestamp('YYYY-MM-DD HH:mm:ss');
		logger(`[${timestampStr}]`, ...args);
	};
};

const logger = timestampDebug(`${APPLICATION_NAME}:info`, '\x1b[33');
const errorLogger = timestampDebug(`${APPLICATION_NAME}:error`, '\x1b[31');
const networkLogger = timestampDebug(`${APPLICATION_NAME}:network`, '\x1b[34');

export { logger, errorLogger, networkLogger };
