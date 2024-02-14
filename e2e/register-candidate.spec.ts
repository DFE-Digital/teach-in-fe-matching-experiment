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
import { deleteInbox, getInbox, getMessageLinks } from "./mailinator";

const surveyLink = config.candidateSurveyUrl;

const hash = new Date().getTime();

const getTestReference = (reference: string): string =>
  `test-${hash}-${reference}`;

const getTestEmail = (reference: string): string =>
  `${reference}@${config.mailinatorDomain}`;

const candidateEmail = getTestEmail(getTestReference("candidate"));

const collegeRecords = testColleges.test2;

for (const groupRecord of collegeRecords.groups) {
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
  test.setTimeout(2 * 60 * 1000); // 2 minutes

  const mailboxesToDelete: string[] = [];

  const cleanup = async () => {
    console.log("🚀🚀🚀 Deleting test candidate 🚀🚀🚀");
    const candidate = await getCandidateByEmail(candidateEmail);

    if (candidate) {
      await deleteContactById(candidate.contactId!);
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
    const candidateFirstName = "Test";
    const candidateLastName = "Candidate";
    const candidatePostCode = testPostcodes.test2.postcode;
    const candidateSubject1 = 'Construction';
    const candidateSubject2 = 'Other: write your subject in the box below';
    const candidateSubject2Other = 'Automated testing';
    const candidateQualification = 'Level 4'
    const candidateExperience = '11 to 20 years';
    const candidateAvailability = 'Full time';

    await page.goto(surveyLink);

    console.log("🚀🚀🚀 Filling in the candidate registration 🚀🚀🚀");

    console.log("Intro page");
    await page.locator("#NextButton").click();

    console.log("'Are you aged 18 or over?' page");
    await page.getByText("Yes").click();
    await page.locator("#NextButton").click();

    console.log("'Where do you currently live?' page")
    await page.getByText("England").click();
    await page.locator("#NextButton").click();

    console.log("'What is your postcode?' page")
    await page.getByLabel("What is your postcode?").fill(candidatePostCode);
    await page.locator("#NextButton").click();

    console.log("'What subject are you interested in teaching?' page")
    await page.getByText(candidateSubject1).click();
    await page.locator("#NextButton").click();

    console.log("'Which construction subject are you interested in teaching? ' page")
    await page.getByText(candidateSubject2).click();
    await page.getByRole('textbox').fill(candidateSubject2Other);
    await page.locator("#NextButton").click();

    console.log("'What is your highest qualification in that subject?' page")
    await page.getByText(candidateQualification).click();
    await page.locator("#NextButton").click();

    console.log("'How much industry experience do you have in the subject you want to teach?' page")
    await page.getByText(candidateExperience).click();
    await page.locator("#NextButton").click();

    console.log("'How much time would you want to spend teaching?' page")
    await page.getByText(candidateAvailability).click();
    await page.locator("#NextButton").click();

    console.log("'Share your contact details' page")
    await page.getByLabel("First name").fill(candidateFirstName);
    await page.getByLabel("Last name").fill(candidateLastName);
    await page.getByLabel("Email address").fill(candidateEmail);
    await page.locator("#NextButton").click();

    console.log("Consent page");
    await page.locator("#NextButton").click();

    // console.log("CAPTCHA page");
    // await page.locator("#NextButton").click();

    console.log("Form submitted");

    await page
      .getByText("Thank you for taking part")
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
    expect(contact.lastName).toEqual(candidateLastName);
    expect(contact.email).toEqual(candidateEmail);
    expect(contact.embeddedData?.postcode).toEqual(candidatePostCode);
    expect(contact.embeddedData?.subject).toContain(candidateSubject1);
    expect(contact.embeddedData?.subSubject).toContain(candidateSubject2Other);
    expect(contact.embeddedData?.qualification).toContain(candidateQualification);
    expect(contact.embeddedData?.experience).toContain(candidateExperience);
    expect(contact.embeddedData?.availability).toContain(candidateAvailability);

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

    expect(contact.embeddedData!.college1Id).toEqual(
      collegeRecords.colleges![0].extRef,
    );

    console.log("🚀🚀🚀 Waiting for the college to be updated 🚀🚀🚀");
    let collegeGroup = await retry(
      async () =>
        await getCollegeGroupByExtRef(collegeRecords.groups![0].extRef!),
      {
        retries: 12,
        delay: 10000,
        until: (collegeGroup) =>
          collegeGroup.embeddedData!.groupStatus == "Invited",
      },
    );

    expect(collegeGroup.embeddedData!.groupStatus).toEqual("Invited");

    console.log("🚀🚀🚀 Waiting for college invite email 🚀🚀🚀");

    const collegeGroupInbox = getTestReference(collegeGroup.extRef!);
    mailboxesToDelete.push(collegeGroupInbox);

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

    // Intro page
    await page.locator("#NextButton").click();

    // College details page
    await page.getByLabel("First name").fill("Joe");
    await page.getByLabel("Last name").fill("Bloggs");
    await page.getByLabel("Your job title").fill("Automated tester");
    await page.getByLabel("Your work email").fill(newGroupEmail);

    await page.locator("#NextButton").click();

    // Terms of the trial page
    await page.locator("#NextButton").click();

    await page.getByText("Thank you for taking part").waitFor({ timeout: 5000 });

    console.log(
      "🚀🚀🚀 Waiting for the college to be updated to 'Active' 🚀🚀🚀",
    );

    collegeGroup = await retry(
      async () =>
        await getCollegeGroupByExtRef(collegeRecords.groups![0].extRef!),
      {
        retries: 12,
        delay: 10000,
        until: (collegeGroup) =>
          collegeGroup.embeddedData?.groupStatus == "Active",
      },
    );

    expect(collegeGroup.firstName).toEqual("Joe");
    expect(collegeGroup.lastName).toEqual("Bloggs");
    expect(collegeGroup.email).toEqual(newGroupEmail);
    expect(collegeGroup.embeddedData?.jobTitle).toEqual("Automated tester");
    expect(collegeGroup.embeddedData?.groupStatus).toEqual("Active");


  });
});
