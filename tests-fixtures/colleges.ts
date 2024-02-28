import config from "../src/config";
import { College, CollegeGroup } from "../src/types";

export default {
  lapland: {
    colleges: [
      {
        extRef: "test-college-1",
        firstName: "Test College 1",
        embeddedData: {
          lat: 66.54698514783581,
          long: 25.827520164677058,
          groupId: "test-group-1",
        },
      },
    ],
    groups: [
      {
        extRef: "test-group-1",
        email: `test-group-1@${config.mailinatorDomain}`,
        embeddedData: {
          groupName: "Test Group 1",
          groupStatus: "Unregistered",
        },
      },
    ],
  },
} as {
  [key: string]: {
    colleges?: Array<College>;
    groups?: Array<CollegeGroup>;
  };
};
