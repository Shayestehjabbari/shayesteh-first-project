const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.sandbox.pawapay.io',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.PAWAPAY_API_TOKEN}`,
  },
});

async function predictProvider(phoneNumber) {
  try {
    const { data } = await client.post('/v2/predict-provider', { phoneNumber });
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

async function fetchActiveConf() {
  try {
    const { data } = await client.get('/v2/active-conf');
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

async function initiateDeposit(payload) {
  try {
    const { data } = await client.post('/v2/deposits', payload);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

async function initiatePayout(payload) {
  try {
    const { data } = await client.post('/v2/payouts', payload);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

async function checkDepositStatus(depositId) {
  try {
    const { data } = await client.get(`/v2/deposits/${depositId}`);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

async function checkPayoutStatus(payoutId) {
  try {
    const { data } = await client.get(`/v2/payouts/${payoutId}`);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

async function initiateRefund(payload) {
  try {
    const { data } = await client.post('/v2/refunds', payload);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

async function checkRefundStatus(refundId) {
  try {
    const { data } = await client.get(`/v2/refunds/${refundId}`);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

async function fetchWalletBalances(country) {
  try {
    const url = country
      ? `/v2/wallet-balances?country=${encodeURIComponent(country)}`
      : '/v2/wallet-balances';
    const { data } = await client.get(url);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

module.exports = {
  predictProvider,
  fetchActiveConf,
  initiateDeposit,
  initiatePayout,
  checkDepositStatus,
  checkPayoutStatus,
  initiateRefund,
  checkRefundStatus,
  fetchWalletBalances,
};
