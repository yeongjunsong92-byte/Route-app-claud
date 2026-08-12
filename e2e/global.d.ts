declare const process: {
  env: {
    E2E_TEST_EMAIL?: string;
    E2E_TEST_PASSWORD?: string;
    [key: string]: string | undefined;
  };
};
