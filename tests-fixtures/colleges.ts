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
        firstName: "Testy",
        lastName: "Tester",
        email: `test-group-1@${config.mailinatorDomain}`,
        embeddedData: {
          groupName: "Test Group 1",
          groupStatus: "Unregistered",
        },
      },
    ],
  },
  ash: {
    colleges: [
      {
        extRef: "test-college-2",
        firstName: "Test College 2",
        embeddedData: {
          lat: 50.90894963291789,
          long: -0.06962100324447584,
          groupId: "test-group-2",
        },
      },
    ],
    groups: [
      {
        extRef: "test-group-2",
        firstName: "Testy",
        lastName: "Tester",
        email: `test-group-2@${config.mailinatorDomain}`,
        embeddedData: {
          groupName: "Test Group 2",
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
