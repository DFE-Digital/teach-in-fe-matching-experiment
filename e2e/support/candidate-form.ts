import { Browser, Page } from "@playwright/test";
import { Candidate } from "../../src/types";
import config from "../../src/config";
import { retry } from "ts-retry-promise";
import { getCandidateByEmail } from "../../src/qualtrics/candidate-service";

export type CandidateFormDetails = {
  firstName: string;
  lastName: string;
  postcode: string;
  subject1: string;
  subject2?: string;
  subject2Other?: string;
  qualification: string;
  experience: string;
  availability: string;
  email: string;
};

export async function fillInCandidateForm(
  browser: Browser,
  candidateFormDetails: CandidateFormDetails,
): Promise<Candidate> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(config.candidateSurveyUrl);

    console.log("🚀🚀🚀 Filling in the candidate registration 🚀🚀🚀");

    console.log("Intro page");
    await page.locator("#NextButton").click();

    console.log("'Are you aged 18 or over?' page");
    await page.getByText("Yes").click();
    await page.locator("#NextButton").click();

    console.log("'Where do you currently live?' page");
    await page.getByText("England").click();
    await page.locator("#NextButton").click();

    console.log("'What is your postcode?' page");
    await page
      .getByLabel("What is your postcode?")
      .fill(candidateFormDetails.postcode);
    await page.locator("#NextButton").click();

    console.log("'What subject are you interested in teaching?' page");
    await page.getByText(candidateFormDetails.subject1).click();
    await page.locator("#NextButton").click();

    if (candidateFormDetails.subject2) {
      console.log(
        "'Which construction subject are you interested in teaching? ' page",
      );
      await page.getByText(candidateFormDetails.subject2).click();
      await page.getByRole("textbox").fill(candidateFormDetails.subject2Other);
      await page.locator("#NextButton").click();
    }

    console.log("'What is your highest qualification in that subject?' page");
    await page.getByText(candidateFormDetails.qualification).click();
    await page.locator("#NextButton").click();

    console.log(
      "'How much industry experience do you have in the subject you want to teach?' page",
    );
    await page.getByText(candidateFormDetails.experience).click();
    await page.locator("#NextButton").click();

    console.log("'How much time would you want to spend teaching?' page");
    await page.getByText(candidateFormDetails.availability).click();
    await page.locator("#NextButton").click();

    console.log("'Share your contact details' page");
    await page.getByLabel("First name").fill(candidateFormDetails.firstName);
    await page.getByLabel("Last name").fill(candidateFormDetails.lastName);
    await page.getByLabel("Email address").fill(candidateFormDetails.email);
    await page.locator("#NextButton").click();

    console.log("Consent page");
    await page.locator("#NextButton").click();

    // console.log("CAPTCHA page");
    // await page.locator("#NextButton").click();

    console.log("Form submitted");

    await page
      .getByText("Thank you for taking part")
      .waitFor({ timeout: 5000 });

    console.log("🚀🚀🚀 Waiting for the details to be updated 🚀🚀🚀");
    let contact = await retry(
      async () => await getCandidateByEmail(candidateFormDetails.email),
      {
        retries: 12,
        delay: 10000,
        timeout: 120000,
        until: (contact) => contact?.embeddedData?.collegeGroup1Id != null,
      },
    );

    return contact;
  } finally {
    await context.close();
  }
}
