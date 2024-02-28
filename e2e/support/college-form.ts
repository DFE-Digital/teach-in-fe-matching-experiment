import { Browser } from "@playwright/test";

export type CollegeFormDetails = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
};

export async function fillInCollegeForm(
  browser: Browser,
  surveyUrl: string,
  collegeFormDetails: CollegeFormDetails,
) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(surveyUrl);

    // Intro page
    await page.locator("#NextButton").click();

    // College details page
    await page.getByLabel("First name").fill(collegeFormDetails.firstName);
    await page.getByLabel("Last name").fill(collegeFormDetails.lastName);
    await page.getByLabel("Your job title").fill(collegeFormDetails.jobTitle);
    await page.getByLabel("Your work email").fill(collegeFormDetails.email);

    await page.locator("#NextButton").click();

    // Terms of the trial page
    await page.locator("#NextButton").click();

    await page
      .getByText("Thank you for taking part")
      .waitFor({ timeout: 5000 });
  } finally {
    await context.close();
  }
}
