import { test, expect } from "@playwright/test";
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
  createCollegeGroup,
  deleteCollegeGroupByExtRef,
  getCollegeGroupByExtRef,
} from "../src/qualtrics/college-group-service";
import { deleteInbox, getInbox, getMessageLinks } from "../src/mailinator";

const surveyLink =
  "https://dferesearch.fra1.qualtrics.com/jfe/form/SV_eWMEBTaDUEcIeOy";

const hash = new Date().getTime();

const getTestReference = (reference: string): string =>
  `test-${hash}-${reference}`;

const getTestEmail = (reference: string): string =>
  `${reference}@${config.mailinatorDomain}`;

const candidateEmail = getTestEmail(getTestReference("candidate"));

const collegeRecords = testColleges.test2;

for (const collegeRecord of collegeRecords.colleges) {
  // collegeRecord.extRef = getTestReference(collegeRecord.extRef);
  // collegeRecord.embeddedData.groupId = getTestReference(collegeRecord.embeddedData.groupId);
}

for (const groupRecord of collegeRecords.groups) {
  // groupRecord.extRef = getTestReference(groupRecord.extRef);
  groupRecord.email = getTestEmail(getTestReference(groupRecord.extRef));
}

const createTestColleges = async () => {
  console.log("🚀🚀🚀 Creating test colleges and groups 🚀🚀🚀");
  for (const record of collegeRecords.colleges) {
    console.log("Creating college", record.firstName);
    await createCollege(record);
  }

  for (const record of collegeRecords.groups) {
    console.log("Creating college group", record.embeddedData.groupName);
    await createCollegeGroup(record);
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

test.describe("Register Candidate", () => {
  test.setTimeout(5 * 60 * 1000); // 5 minutes

  const mailboxesToDelete = [];

  const cleanup = async () => {
    console.log("🚀🚀🚀 Deleting test candidate 🚀🚀🚀");
    const candidate = await getCandidateByEmail(candidateEmail);

    if (candidate) {
      await deleteContactById(candidate.id);
    }
  };

  test.beforeAll(async () => {
    console.log("🚀🚀🚀 Setting up test data 🚀🚀🚀");
    await deleteTestColleges();
    await createTestColleges();
  });

  test.afterAll(async () => {
    console.log("🚀🚀🚀 Deleting test data 🚀🚀🚀");
    await cleanup();
    await deleteTestColleges();

    for (const mailbox of mailboxesToDelete) {
      console.log("Deleting mailbox ", mailbox);
      deleteInbox(mailbox);
    }
  });

  test("Registering a new candidate", async ({ page }) => {
    const candidateFirstName = "Test Candidate";
    const candidatePostCode = testPostcodes.test2.postcode;

    await page.goto(surveyLink);

    console.log("🚀🚀🚀 Filling in the candidate registration 🚀🚀🚀");
    await page.getByLabel("What is your first name?").fill(candidateFirstName);
    await page.getByLabel("What is your postcode?").fill(candidatePostCode);
    await page.getByLabel("What is your email address?").fill(candidateEmail);
    await page.locator("#NextButton").click();
    console.log("Form submitted");

    await page
      .getByText("Your response has been recorded")
      .waitFor({ timeout: 5000 });

    console.log("🚀🚀🚀 Waiting for the contact details to be updated 🚀🚀🚀");
    let contact = await retry(
      async () => await getCandidateByEmail(candidateEmail),
      {
        retries: 12,
        delay: 10000,
        until: (contact) => contact?.embeddedData?.college1Id != null,
      },
    );

    expect(contact.firstName).toEqual(candidateFirstName);
    expect(contact.embeddedData.postcode).toEqual(candidatePostCode);
    expect(contact.email).toEqual(candidateEmail);

    console.log(
      "🚀🚀🚀 Waiting for the college to be stored against the contact 🚀🚀🚀",
    );
    contact = await retry(
      async () => await getCandidateByEmail(candidateEmail),
      {
        retries: 12,
        delay: 10000,
        until: (contact) => contact?.embeddedData?.college1Id != null,
      },
    );

    expect(contact.embeddedData.college1Id).toEqual(
      collegeRecords.colleges[0].extRef,
    );

    console.log("🚀🚀🚀 Waiting for the college to be updated 🚀🚀🚀");
    let collegeGroup = await retry(
      async () =>
        await getCollegeGroupByExtRef(collegeRecords.groups[0].extRef),
      {
        retries: 12,
        delay: 10000,
        until: (collegeGroup) =>
          collegeGroup.embeddedData.groupStatus == "Invited",
      },
    );

    expect(collegeGroup.embeddedData.groupStatus).toEqual("Invited");

    console.log("🚀🚀🚀 Waiting for college invite email 🚀🚀🚀");

    const collegeGroupInbox = getTestReference(collegeGroup.extRef);
    mailboxesToDelete.push(collegeGroupInbox);

    console.log("  Inbox is ", collegeGroupInbox);

    let collegeSurveyLink: any;

    await retry(
      async () => {
        const inbox = await getInbox(collegeGroupInbox);

        for (const message of inbox.msgs) {
          console.log("  Found an email: ", message.id);

          const links = await getMessageLinks(collegeGroupInbox, message.id);

          collegeSurveyLink = links.links.find((link) =>
            link.includes("jfe/form"),
          );

          if (collegeSurveyLink) {
            console.log("  Found survey link", collegeSurveyLink);
            break;
          }
        }
      },
      { retries: 12, delay: 10000, until: () => collegeSurveyLink },
    );

    expect(collegeSurveyLink).toBeTruthy();

    console.log("🚀🚀🚀 Filling in the college registration form 🚀🚀🚀");
    const newGroupEmail = getTestEmail("joe-bloggs");

    await page.goto(collegeSurveyLink);

    await page.getByLabel("First name").fill("Joe");
    await page.getByLabel("Last name").fill("Bloggs");
    await page.getByLabel("Your job title").fill("Automated tester");
    await page.getByLabel("Email").fill(newGroupEmail);

    await page.locator("#NextButton").click();

    await page.getByText("Thank you for signing up").waitFor({ timeout: 5000 });

    console.log(
      "🚀🚀🚀 Waiting for the college to be updated to 'Active' 🚀🚀🚀",
    );

    collegeGroup = await retry(
      async () =>
        await getCollegeGroupByExtRef(collegeRecords.groups[0].extRef),
      {
        retries: 12,
        delay: 10000,
        until: (collegeGroup) =>
          collegeGroup.embeddedData.groupStatus == "Active",
      },
    );

    expect(collegeGroup.firstName).toEqual("Joe");
    expect(collegeGroup.lastName).toEqual("Bloggs");
    expect(collegeGroup.email).toEqual(newGroupEmail);
    expect(collegeGroup.embeddedData.jobTitle).toEqual("Automated tester");
    expect(collegeGroup.embeddedData.groupStatus).toEqual("Active");
  });
});
