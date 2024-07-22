import * as process from 'process';

import * as Joi from 'joi';

type EnvironmentTypes = 'development' | 'staging' | 'production';
export let currentEnvironment: EnvironmentTypes;

export const loadConfiguration = (): Record<string, unknown> => {
  currentEnvironment = process.env.APP_ENVIRONMENT as EnvironmentTypes;

  return {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    backendUrl: process.env.BACKEND_URL,
    corsClientUrls: process.env.CORS_CLIENT_URLS?.split(','),
    database: {
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT as string),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      dbName: process.env.DATABASE_NAME,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: parseInt(process.env.JWT_EXPIRES_IN as string),
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN as string),
      signUpSecret: process.env.JWT_SIGN_UP_SECRET,
      signUpExpiresIn: parseInt(process.env.JWT_SIGN_UP_EXPIRES_IN as string),
    },
    // redis: {
    //   pubSub: {
    //     host: process.env.REDIS_PUBSUB_HOST,
    //     port: process.env.REDIS_PUBSUB_PORT,
    //   },
    //   common: {
    //     host: process.env.REDIS_HOST,
    //     port: process.env.REDIS_PORT,
    //   },
    //   expiresIn: process.env.REDIS_EXPIRES_IN,
    // },
    // aws: {
    //   accessKey: process.env.AWS_ACCESS_KEY,
    //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    // },
    // googleMaps: {
    //   apiKey: process.env.GOOGLE_MAPS_API_KEY,
    // },
    // s3: {
    //   region: process.env.S3_REGION_NAME,
    //   publicBucket: process.env.S3_PUBLIC_BUCKET_NAME,
    //   privateBucket: process.env.S3_PRIVATE_BUCKET_NAME,
    //   putActionExpiresSec: parseInt(process.env.S3_PUT_ACTION_EXPIRES_SEC as string, 10),
    //   getActionExpiresSec: parseInt(process.env.S3_GET_ACTION_EXPIRES_SEC as string, 10),
    // },
    // sns: {
    //   region: process.env.SNS_AWS_REGION_NAME,
    //   accessKey: process.env.SNS_AWS_ACCESS_KEY,
    //   secretAccessKey: process.env.SNS_AWS_SECRET_ACCESS_KEY,
    // },
    // sqs: {
    //   region: process.env.SNS_AWS_REGION_NAME,
    //   accessKey: process.env.SQS_AWS_ACCESS_KEY,
    //   secretAccessKey: process.env.SQS_AWS_SECRET_ACCESS_KEY,
    //   queue: {
    //     url: {
    //       checkAccessInnopayGuid: process.env.SQS_AWS_CHECK_ACCESS_INNOPAY_GUID_QUEUE_URL,
    //       stuckedInnopayGuidStatus: process.env.SQS_AWS_STUCKED_INNOPAY_GUID_STATUS_QUEUE_URL,
    //       cancelInnopayTransaction: process.env.SQS_AWS_CANCEL_INNOPAY_TRANSACTION_QUEUE_URL,
    //       completeCashOutInnopayTransaction: process.env.SQS_AWS_COMPLETE_CASH_OUT_QUEUE_NAME,
    //     },
    //     name: {
    //       checkAccessInnopayGuid: process.env.SQS_AWS_CHECK_ACCESS_INNOPAY_GUID_QUEUE_NAME,
    //       stuckedInnopayGuidStatus: process.env.SQS_AWS_STUCKED_INNOPAY_GUID_STATUS_QUEUE_NAME,
    //       cancelInnopayTransaction: process.env.SQS_AWS_CANCEL_INNOPAY_TRANSACTION_QUEUE_NAME,
    //       completeCashOutInnopayTransaction: process.env.SQS_AWS_COMPLETE_CASH_OUT_QUEUE_URL,
    //     },
    //   },
    // },
    // ses: {
    //   region: process.env.SES_AWS_REGION_NAME,
    //   accessKey: process.env.SES_AWS_ACCESS_KEY,
    //   secretAccessKey: process.env.SES_AWS_SECRET_ACCESS_KEY,
    //   emailFrom: process.env.SES_AWS_EMAIL_FROM,
    //   tokenExp: process.env.SES_AWS_TOKEN_EXPIRES_IN,
    // },
    // sentry: {
    //   dsn: process.env.SENTRY_DSN,
    // },
    // cf: {
    //   publicFiles: process.env.AWS_CF_PUBLIC_FILES,
    //   privateFiles: process.env.AWS_CF_PRIVATE_FILES,
    // },
    // payment: {
    //   // realMerchantId: process.env.REAL_PAYMENT_MERCHANT_ID,
    //   // virtualMerchantId: process.env.VIRTUAL_PAYMENT_MERCHANT_ID,
    //   // oneClickApiUrl: process.env.PAYMENT_ONE_CLICK_API_URL,
    //   // eComApiUrl: process.env.PAYMENT_E_COM_API_URL,
    //   // merchantKeyword: process.env.PAYMENT_MERCHANT_KEYWORD,
    //   // livin: {
    //   //   subaccount: {
    //   //     cardId: process.env.PAYMENT_LIVIN_SUBACCOUNT_CARD_ID,
    //   //     userId: process.env.PAYMENT_LIVIN_SUBACCOUNT_USER_ID,
    //   //     userLogin: process.env.PAYMENT_LIVIN_SUBACCOUNT_USER_LOGIN,
    //   //   },
    //   //   withdrawal: {
    //   //     cardId: process.env.PAYMENT_LIVIN_WITHDRAWAL_CARD_ID,
    //   //     userId: process.env.PAYMENT_LIVIN_WITHDRAWAL_USER_ID,
    //   //   },
    //   // },
    // },
    // newRelic: {
    //   name: process.env.NEWRELIC_APP_NAME,
    //   key: process.env.NEWRELIC_LICENSE_KEY,
    // },
    // frontEnd: {
    //   url: process.env.FRONTEND_URL,
    // },
    // serverless: {
    //   username: process.env.BASIC_AUTH_USERNAME,
    //   password: process.env.BASIC_AUTH_PASSWORD,
    // },
    // smsCenter: {
    //   login: 'Livin.agency4',
    //   password: '11Qa-11Qa-livin',
    //   sender: 'Livin',
    //   link: 'https://smsc.kz/sys/send.php?',
    // },
  };
};

export const validationSchema = Joi.object({
  //ENV
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
  PORT: Joi.number().required(),
  CORS_CLIENT_URLS: Joi.string().required(),
  BACKEND_URL: Joi.string().required(),

  // SEED

  // SMS_CODE
  // SMS_CODE_LENGTH: Joi.number().required(),
  // SMS_CODE_EXPIRES_IN_SECONDS: Joi.number().required(),

  //DATABASE
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.number().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.number().required(),
  JWT_SIGN_UP_SECRET: Joi.string().required(),
  JWT_SIGN_UP_EXPIRES_IN: Joi.number().required(),

  // REDIS
  // REDIS_PUBSUB_HOST: Joi.string().required(),
  // REDIS_PUBSUB_PORT: Joi.number().required(),
  // REDIS_HOST: Joi.string().required(),
  // REDIS_PORT: Joi.number().required(),
  // REDIS_EXPIRES_IN: Joi.string().required(),
  //
  // // #AWS
  // AWS_ACCESS_KEY: Joi.string().required(),
  // AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  // AWS_KEYPAIR_ID: Joi.string().required(),
  //
  // // #S3
  // S3_REGION_NAME: Joi.string().required(),
  // S3_PUBLIC_BUCKET_NAME: Joi.string().required(),
  // S3_PRIVATE_BUCKET_NAME: Joi.string().required(),
  // S3_PUT_ACTION_EXPIRES_SEC: Joi.number().integer().required(),
  // S3_GET_ACTION_EXPIRES_SEC: Joi.number().integer().required(),
  //
  // // #ELASTICSEARCH
  // ES_AWS_ACCESS_KEY: Joi.string().required(),
  // ES_AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  // ES_AWS_REGION_NAME: Joi.string().required(),
  // ES_AWS_ELASTICSEARCH_NODE: Joi.string().required(),
  //
  // // #SNS
  // SNS_AWS_REGION_NAME: Joi.string().required(),
  // SNS_AWS_ACCESS_KEY: Joi.string().required(),
  // SNS_AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  //
  // // #SQS
  // SQS_AWS_REGION_NAME: Joi.string().required(),
  // SQS_AWS_ACCESS_KEY: Joi.string().required(),
  // SQS_AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  // SQS_AWS_CHECK_ACCESS_INNOPAY_GUID_QUEUE_URL: Joi.string().required(),
  // SQS_AWS_CHECK_ACCESS_INNOPAY_GUID_QUEUE_NAME: Joi.string().required(),
  // SQS_AWS_STUCKED_INNOPAY_GUID_STATUS_QUEUE_URL: Joi.string().required(),
  // SQS_AWS_STUCKED_INNOPAY_GUID_STATUS_QUEUE_NAME: Joi.string().required(),
  // SQS_AWS_CANCEL_INNOPAY_TRANSACTION_QUEUE_URL: Joi.string().required(),
  // SQS_AWS_CANCEL_INNOPAY_TRANSACTION_QUEUE_NAME: Joi.string().required(),
  // SQS_AWS_COMPLETE_CASH_OUT_QUEUE_URL: Joi.string().required(),
  // SQS_AWS_COMPLETE_CASH_OUT_QUEUE_NAME: Joi.string().required(),
  //
  // // #SES
  // SES_AWS_ACCESS_KEY: Joi.string().required(),
  // SES_AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  // SES_AWS_REGION_NAME: Joi.string().required(),
  // SES_AWS_EMAIL_FROM: Joi.string().required(),
  // SES_AWS_TOKEN_EXPIRES_IN: Joi.string().required(),
  //
  // // #SENTRY
  // SENTRY_DSN: Joi.string().required(),
  //
  // // #CF
  // AWS_CF_PUBLIC_FILES: Joi.string().required(),
  // AWS_CF_PRIVATE_FILES: Joi.string().required(),
  //
  // // GOOGLE
  // GOOGLE_MAPS_API_KEY: Joi.string().required(),
  //
  // // #PAYMENT
  // // REAL_PAYMENT_MERCHANT_ID: Joi.string()
  // //   .regex(/^.{15}$/)
  // //   .required(),
  // //
  // // VIRTUAL_PAYMENT_MERCHANT_ID: Joi.string()
  // //   .regex(/^.{15}$/)
  // //   .required(),
  //
  // // PAYMENT_ONE_CLICK_API_URL: Joi.string().required(),
  // // PAYMENT_E_COM_API_URL: Joi.string().required(),
  // // PAYMENT_MERCHANT_KEYWORD: Joi.string().required(),
  // // #PAYMENT CARDS
  // // PAYMENT_LIVIN_SUBACCOUNT_CARD_ID: Joi.number().required(),
  // // PAYMENT_LIVIN_SUBACCOUNT_USER_ID: Joi.number().required(),
  // // PAYMENT_LIVIN_SUBACCOUNT_USER_LOGIN: Joi.string().required(),
  // // PAYMENT_LIVIN_WITHDRAWAL_CARD_ID: Joi.number().required(),
  // // PAYMENT_LIVIN_WITHDRAWAL_USER_ID: Joi.number().required(),
  //
  // //  NEW RELIC
  // NEWRELIC_APP_NAME: Joi.string(),
  // NEWRELIC_LICENSE_KEY: Joi.string(),
  //
  // //FRONTEND URL
  // FRONTEND_URL: Joi.string().required(),
  //
  // // SERVERLESS ACCESS
  // BASIC_AUTH_USERNAME: Joi.string().required(),
  // BASIC_AUTH_PASSWORD: Joi.string().required(),
  //
  // // SOCIAL PAGES
  // INSTAGRAM: Joi.string().required(),
  // FACEBOOK: Joi.string().required(),
  // LINKEDIN: Joi.string().required(),
});
