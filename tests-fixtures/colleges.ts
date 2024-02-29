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
      {
        extRef: "test-college-2",
        firstName: "Test College 2",
        embeddedData: {
          lat: 66.56546526197312,
          long: 25.831570177210025,
          groupId: "test-group-2",
        },
      },
      {
        extRef: "test-college-3",
        firstName: "Test College 3",
        embeddedData: {
          lat: 66.57026091296423,
          long: 25.853847498125155,
          groupId: "test-group-2",
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
      {
        extRef: "test-group-2",
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
