import { Network } from '@capacitor/network';

export const startNetworkMonitoring = (callback) => {
  Network.getStatus().then(status => callback(status.connected));
  const listener = Network.addListener('networkStatusChange', status => {
    callback(status.connected);
  });
  return listener;
};

export const isOnline = async () => {
  const status = await Network.getStatus();
  return status.connected;
};