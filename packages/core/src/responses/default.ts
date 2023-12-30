interface IRateLimitReport {
  facetQueryId: string;
  rateCount: number;
  queryBudget: number;
}

export const unauthorizedResponse = {
  errors: [
    {
      message: "Unauthorized",
      extensions: {
        code: "UNAUTHORIZED",
        statusCode: 401,
      },
    },
  ],
};

export const buildRateLimitResponse = (
  excedeedRateCountReports: IRateLimitReport[],
) => {
  return {
    errors: [
      {
        message: `Too many requests for ${excedeedRateCountReports
          ?.map((report) => {
            return `${report.facetQueryId} (${report.rateCount}/${report.queryBudget} allowed per minute)`;
          })
          .join(", ")}`,
        extensions: {
          code: "TOO_MANY_REQUESTS",
          statusCode: 429,
        },
      },
    ],
  };
};
