import { test, expect, Page } from "@playwright/test";
import { deleteContactById } from "../src/qualtrics/qualtrics-service";
import { retry } from "ts-retry-promise";
import config from "../src/config";
import testPostcodes from "../tests-fixtures/postcodes";
import testColleges from "../tests-fixtures/colleges";
import { getCandidateByEmail } from "../src/qualtrics/candidate-service";
import {
  createCollege,
  deleteCollegeByExtRef,
} from "../src/qualtrics/college-service";
import {
  createOrUpdateCollegeGroup,
  deleteCollegeGroupByExtRef,
  getCollegeGroupByExtRef,
} from "../src/qualtrics/college-group-service";
import {
  deleteInbox,
  deleteMessage,
  getInbox,
  getMessage,
  getMessageLinks,
} from "./mailinator";
import axios from "axios";
import { parseCandidateEmailHtml } from "./support/email-parser";
import { CollegeGroup, CollegeGroupStatus } from "../src/types";
import {
  CandidateFormDetails,
  fillInCandidateForm,
} from "./support/candidate-form";
import { CollegeFormDetails, fillInCollegeForm } from "./support/college-form";

const hash = new Date().getTime();

const getTestReference = (reference: string): string =>
  `test-${hash}-${reference}`;

const getTestEmail = (reference: string): string =>
  `${reference}@${config.mailinatorDomain}`;

const collegeRecords = testColleges.lapland;

for (const groupRecord of collegeRecords.groups) {
  groupRecord.email = getTestEmail(getTestReference(groupRecord.extRef));
}

test.describe("No matching colleges", () => {
  test.setTimeout(5 * 60 * 1000); // 3 minutes
});

test.describe("Register Candidate", () => {
  test.setTimeout(5 * 60 * 1000); // 3 minutes

  const mailboxesToDelete: string[] = [];
  const candidatessToDelete: string[] = [];

  const createTestColleges = async () => {
    console.log("🚀🚀🚀 Creating test colleges and groups 🚀🚀🚀");
    for (const record of collegeRecords.colleges) {
      console.log("Creating college", record.firstName);
      await createCollege(record);
    }

    for (const record of collegeRecords.groups) {
      console.log("Creating college group", record.embeddedData.groupName);
      await createOrUpdateCollegeGroup(record);
    }
  };

  const deleteTestColleges = async () => {
    console.log("🚀🚀🚀 Deleting test colleges and groups 🚀🚀🚀");
    for (const record of collegeRecords.colleges) {
      await deleteCollegeByExtRef(record.extRef);
    }

    for (const record of collegeRecords.groups) {
      await deleteCollegeGroupByExtRef(record.extRef);
    }
  };

  const deleteTestCandidates = async () => {
    console.log("🚀🚀🚀 Deleting test candidates 🚀🚀🚀");
    for (const email of candidatessToDelete) {
      const candidate = await getCandidateByEmail(email);

      if (candidate) {
        await deleteContactById(candidate.contactId!);
      }
    }
  };

  const deleteTestMaiboxes = async () => {
    for (const mailbox of mailboxesToDelete) {
      await deleteInbox(mailbox);
    }
  };

  test.beforeAll(async () => {
    console.log("🚀🚀🚀 Setting up test data 🚀🚀🚀");
    await deleteTestColleges();
    await createTestColleges();
  });

  test.afterAll(async () => {
    console.log("🚀🚀🚀 Deleting test data 🚀🚀🚀");
    await deleteTestCandidates();
    await deleteTestColleges();
    await deleteTestMaiboxes();
  });

  test("Registering a new candidate", async ({ page, browser }) => {
    const testCandidate: CandidateFormDetails = {
      firstName: "Test",
      lastName: "Candidate",
      postcode: testPostcodes.matches.postcode,
      subject1: "construction",
      subject2: "Other: write your subject in the box below",
      subject2Other: "Automated testing",
      qualification: "Level 4",
      experience: "11 to 20 years",
      availability: "Full time",
      email: getTestEmail(getTestReference("candidate1")),
    };

    const contact = await fillInCandidateForm(browser, testCandidate);
    candidatessToDelete.push(testCandidate.email);

    expect(contact.firstName).toEqual(testCandidate.firstName);
    expect(contact.lastName).toEqual(testCandidate.lastName);
    expect(contact.email).toEqual(testCandidate.email);
    expect(contact.embeddedData?.postcode).toEqual(testCandidate.postcode);
    expect(contact.embeddedData?.subject).toContain(testCandidate.subject1);
    expect(contact.embeddedData?.subSubject).toContain(
      testCandidate.subject2Other,
    );
    expect(contact.embeddedData?.qualification).toContain(
      testCandidate.qualification,
    );
    expect(contact.embeddedData?.experience).toContain(
      testCandidate.experience,
    );
    expect(contact.embeddedData?.availability).toContain(
      testCandidate.availability,
    );
    expect(contact.embeddedData?.collegeGroup1Id).toEqual(
      collegeRecords.groups[0].extRef,
    );
    expect(contact.embeddedData?.collegeGroup1Colleges).toEqual(
      collegeRecords.colleges[0].extRef,
    );

    let collegeGroup = await waitForCollegeGroupStatus(
      collegeRecords.groups[0].extRef,
      "Invited",
    );

    console.log("🚀🚀🚀 Waiting for college invite email 🚀🚀🚀");

    const initialCollegeGroupInbox = getTestReference(collegeGroup.extRef!);
    mailboxesToDelete.push(initialCollegeGroupInbox);

    const collegeSurveyLink = await getCollegeGroupInviteLinkAndDeleteEmail(
      initialCollegeGroupInbox,
    );

    console.log("🚀🚀🚀 Filling in the college registration form 🚀🚀🚀");
    const newGroupEmail = getTestEmail(getTestReference("joe-bloggs"));
    mailboxesToDelete.push(getTestReference("joe-bloggs"));

    const testCollegeUserDetails: CollegeFormDetails = {
      firstName: "Joe",
      lastName: "Bloggs",
      jobTitle: "Automated tester",
      email: newGroupEmail,
    };

    await fillInCollegeForm(browser, collegeSurveyLink, testCollegeUserDetails);

    collegeGroup = await waitForCollegeGroupStatus(
      collegeGroup.extRef,
      "Active",
    );

    expect(collegeGroup.firstName).toEqual("Joe");
    expect(collegeGroup.lastName).toEqual("Bloggs");
    expect(collegeGroup.email).toEqual(newGroupEmail);
    expect(collegeGroup.embeddedData?.jobTitle).toEqual("Automated tester");
    expect(collegeGroup.embeddedData?.groupStatus).toEqual("Active");

    console.log(
      "🚀🚀🚀 Triggering sending the candidate email to colleges 🚀🚀🚀",
    );

    await axios.post(config.triggerSendCandidateDetailsUrl!);

    console.log("🚀🚀🚀 Waiting for the email 🚀🚀🚀");

    const updatedCollegeGroupInbox = getTestReference("joe-bloggs");
    mailboxesToDelete.push(updatedCollegeGroupInbox);

    const parsedEmail = await getCandidateEmailSentToCollegeAndDeleteEmail(
      updatedCollegeGroupInbox,
    );

    expect(parsedEmail).toHaveLength(1);
    expect(parsedEmail[0].subject).toEqual(testCandidate.subject1);
    expect(parsedEmail[0].name).toEqual(
      `${testCandidate.firstName} ${testCandidate.lastName}`,
    );
    expect(parsedEmail[0].email).toEqual(
      `<a href="mailto:${testCandidate.email}">${testCandidate.email}</a>`,
    );
    expect(parsedEmail[0].colleges).toEqual([
      collegeRecords.colleges[0].firstName,
    ]);
    expect(parsedEmail[0].subject2).toEqual(testCandidate.subject2Other);
    expect(parsedEmail[0].qualification).toEqual(testCandidate.qualification);
    expect(parsedEmail[0].experience).toEqual(testCandidate.experience);
    expect(parsedEmail[0].availability).toEqual(testCandidate.availability);

    console.log("🚀🚀🚀 Registering a second candidate 🚀🚀🚀");
    const testCandidate2: CandidateFormDetails = {
      firstName: "Test2",
      lastName: "Candidate2",
      postcode: testPostcodes.matches.postcode,
      subject1: "law",
      qualification: "Level 3",
      experience: "11 to 20 years",
      availability: "Full time",
      email: getTestEmail(getTestReference("candidate2")),
    };

    const contact2 = await fillInCandidateForm(browser, testCandidate2);
    candidatessToDelete.push(testCandidate2.email);

    const parsedEmail2 = await getCandidateEmailSentToCollegeAndDeleteEmail(
      updatedCollegeGroupInbox,
    );

    expect(parsedEmail2).toHaveLength(1);
    expect(parsedEmail2[0].subject).toEqual(testCandidate2.subject1);
    expect(parsedEmail2[0].name).toEqual(
      `${testCandidate2.firstName} ${testCandidate2.lastName}`,
    );
    expect(parsedEmail2[0].email).toEqual(
      `<a href="mailto:${testCandidate2.email}">${testCandidate2.email}</a>`,
    );
    expect(parsedEmail2[0].colleges).toEqual([
      collegeRecords.colleges[0].firstName,
    ]);
    expect(parsedEmail2[0].subject2).toEqual(testCandidate2.subject2Other);
    expect(parsedEmail2[0].qualification).toEqual(testCandidate2.qualification);
    expect(parsedEmail2[0].experience).toEqual(testCandidate2.experience);
    expect(parsedEmail2[0].availability).toEqual(testCandidate2.availability);
  });
});

async function waitForCollegeGroupStatus(
  collegeGroupExtRef: string,
  status: CollegeGroupStatus,
): Promise<CollegeGroup> {
  console.log(
    `🚀🚀🚀 Waiting for the college ${collegeGroupExtRef} to be updated to ${status} 🚀🚀🚀`,
  );

  const collegeGroup = await retry(
    async () => await getCollegeGroupByExtRef(collegeGroupExtRef),
    {
      retries: 12,
      delay: 10000,
      timeout: 120000,
      until: (collegeGroup) => collegeGroup.embeddedData!.groupStatus == status,
    },
  );

  expect(collegeGroup.embeddedData!.groupStatus).toEqual(status);

  return collegeGroup;
}

async function getCollegeGroupInviteLinkAndDeleteEmail(
  collegeGroupInbox: string,
): Promise<string> {
  console.log("  Inbox is ", collegeGroupInbox);

  let collegeSurveyLink: any;

  await retry(
    async () => {
      const inbox = await getInbox(collegeGroupInbox);

      for (const message of inbox!.msgs) {
        console.log("  Found an email: ", message.id);

        const links = await getMessageLinks(collegeGroupInbox, message.id);

        collegeSurveyLink = links!.links.find((link) =>
          link.includes("jfe/form"),
        );

        if (collegeSurveyLink) {
          console.log("  Found survey link", collegeSurveyLink);
          deleteMessage(collegeGroupInbox, message.id);
          break;
        }
      }
    },
    {
      retries: 12,
      delay: 10000,
      timeout: 120000,
      until: () => collegeSurveyLink,
    },
  );

  expect(collegeSurveyLink).toBeTruthy();

  return collegeSurveyLink;
}

async function getCandidateEmailSentToCollegeAndDeleteEmail(
  collegeGroupInbox: string,
) {
  let messageHtml: string;

  await retry(
    async () => {
      const inbox = await getInbox(collegeGroupInbox);

      for (const message of inbox!.msgs) {
        console.log("  Found an email: ", message.id);

        if (message.subject.includes("Potential teachers for your college")) {
          console.log("  Found potential teacher email");
          const messageDetail = await getMessage(collegeGroupInbox, message.id);

          console.log("  Extracting HTML part");
          const htmlpart = messageDetail.parts.filter((part) =>
            part.headers["content-type"].includes("text/html"),
          )[0];

          messageHtml = htmlpart.body;

          deleteMessage(collegeGroupInbox, message.id);
          break;
        }
      }
    },
    {
      retries: 12,
      delay: 10000,
      timeout: 120000,
      until: () => messageHtml != undefined,
    },
  );

  return parseCandidateEmailHtml(messageHtml);
}
