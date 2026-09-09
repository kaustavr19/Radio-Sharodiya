import { getTester } from './store.js';
import { readCookie, verifySessionToken } from './security.js';

export const readBetaSession = (request, config) => verifySessionToken(readCookie(request), config.sessionSecret);

export const isAdminSession = (session, config) => session?.role === 'admin' && session.email === config.adminEmail;

export const activeTesterForSession = async (request, config) => {
  const session = readBetaSession(request, config);
  if (!session || session.role !== 'tester') return undefined;
  const tester = await getTester(config, session.email);
  if (!tester || tester.status !== 'active' || tester.session_version !== session.version) return undefined;
  return tester;
};
