const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pawapay = require('../services/pawapay');
const store = require('../services/transactionStore');

const router = express.Router();

function resolveCurrency(activeConf, provider, operationType) {
  for (const country of activeConf.countries || []) {
    for (const p of country.providers || []) {
      if (p.provider !== provider) continue;
      for (const curr of p.currencies || []) {
        if (curr.operationTypes && curr.operationTypes[operationType]) {
          return curr.currency;
        }
      }
    }
  }
  return null;
}

async function handleTransaction(req, res, type) {
  const { phoneNumber, amount } = req.body;

  if (!phoneNumber || !amount) {
    return res.json({
      success: false,
      step: 'validation',
      error: 'phoneNumber and amount are required',
    });
  }

  // Step 1: Predict provider
  const prediction = await pawapay.predictProvider(phoneNumber);
  if (!prediction.success) {
    return res.json({
      success: false,
      step: 'predict-provider',
      error: prediction.error,
    });
  }

  const { provider, phoneNumber: sanitizedPhone, country } = prediction.data;

  // Step 2: Fetch active-conf and resolve currency
  const conf = await pawapay.fetchActiveConf();
  if (!conf.success) {
    return res.json({
      success: false,
      step: 'resolve-currency',
      predictedProvider: prediction.data,
      error: conf.error,
    });
  }

  const opType = type === 'deposit' ? 'DEPOSIT' : 'PAYOUT';
  const currency = resolveCurrency(conf.data, provider, opType);
  if (!currency) {
    return res.json({
      success: false,
      step: 'resolve-currency',
      predictedProvider: prediction.data,
      error: `No ${opType} currency found for provider ${provider}`,
    });
  }

  // Step 3: Build payload and initiate transaction
  const id = uuidv4();
  let payload, result;

  if (type === 'deposit') {
    payload = {
      depositId: id,
      amount: String(amount),
      currency,
      payer: {
        type: 'MMO',
        accountDetails: {
          phoneNumber: sanitizedPhone,
          provider,
        },
      },
    };
    result = await pawapay.initiateDeposit(payload);
  } else {
    payload = {
      payoutId: id,
      amount: String(amount),
      currency,
      recipient: {
        type: 'MMO',
        accountDetails: {
          phoneNumber: sanitizedPhone,
          provider,
        },
      },
    };
    result = await pawapay.initiatePayout(payload);
  }

  if (!result.success) {
    return res.json({
      success: false,
      step: type,
      predictedProvider: prediction.data,
      resolvedCurrency: currency,
      requestSent: payload,
      error: result.error,
    });
  }

  // Log to transaction store
  store.addTransaction({
    type,
    [type === 'deposit' ? 'depositId' : 'payoutId']: id,
    amount: String(amount),
    currency,
    phoneNumber: sanitizedPhone,
    provider,
    country,
    status: result.data?.status || 'UNKNOWN',
  });

  return res.json({
    success: true,
    step: type,
    predictedProvider: prediction.data,
    resolvedCurrency: currency,
    requestSent: payload,
    response: result.data,
  });
}

router.post('/deposit', (req, res) => handleTransaction(req, res, 'deposit'));
router.post('/payout', (req, res) => handleTransaction(req, res, 'payout'));

router.get('/active-conf', async (_req, res) => {
  const result = await pawapay.fetchActiveConf();
  if (!result.success) {
    return res.json({ success: false, error: result.error });
  }
  return res.json({ success: true, data: result.data });
});

// Check deposit status
router.get('/deposit-status/:id', async (req, res) => {
  const result = await pawapay.checkDepositStatus(req.params.id);
  if (!result.success) {
    return res.json({ success: false, error: result.error });
  }
  return res.json({ success: true, data: result.data });
});

// Check payout status
router.get('/payout-status/:id', async (req, res) => {
  const result = await pawapay.checkPayoutStatus(req.params.id);
  if (!result.success) {
    return res.json({ success: false, error: result.error });
  }
  return res.json({ success: true, data: result.data });
});

// Initiate refund
router.post('/refund', async (req, res) => {
  const { depositId, amount } = req.body;

  if (!depositId) {
    return res.json({
      success: false,
      error: 'depositId is required',
    });
  }

  const refundId = uuidv4();
  const payload = { refundId, depositId };
  if (amount) {
    payload.amount = String(amount);
  }

  const result = await pawapay.initiateRefund(payload);
  if (!result.success) {
    return res.json({
      success: false,
      requestSent: payload,
      error: result.error,
    });
  }

  // Log to transaction store
  store.addTransaction({
    type: 'refund',
    refundId,
    depositId,
    amount: amount ? String(amount) : 'FULL',
    status: result.data?.status || 'UNKNOWN',
  });

  return res.json({
    success: true,
    requestSent: payload,
    response: result.data,
  });
});

// Check refund status
router.get('/refund-status/:id', async (req, res) => {
  const result = await pawapay.checkRefundStatus(req.params.id);
  if (!result.success) {
    return res.json({ success: false, error: result.error });
  }
  return res.json({ success: true, data: result.data });
});

// Wallet balances
router.get('/wallet-balances', async (req, res) => {
  const result = await pawapay.fetchWalletBalances(req.query.country);
  if (!result.success) {
    return res.json({ success: false, error: result.error });
  }
  return res.json({ success: true, data: result.data });
});

// Transaction history
router.get('/transactions', (_req, res) => {
  return res.json({ success: true, data: store.getTransactions() });
});

module.exports = router;
