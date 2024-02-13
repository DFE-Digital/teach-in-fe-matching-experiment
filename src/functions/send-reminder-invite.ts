import "dotenv/config";
import config from "../config";
import { getAllCollegeGroups, formatDate } from "../qualtrics/college-group-service";
import { app } from "@azure/functions";
import axios from "axios";
const urls = require("./urls");
 
app.http("send-reminder-invite", {
    methods: ["GET", "POST"],
    authLevel: "function",
    handler: async (request, context) => {
        const timeElapsed = Date.now();
        const currentDate = new Date(timeElapsed);

        let activeCollegeGroups = (await getAllCollegeGroups()).filter(
            (collegeGroup) =>
                collegeGroup.embeddedData?.groupStatus == "Invited"
                && !collegeGroup.embeddedData?.unsubscribed
                && (collegeGroup.embeddedData.invitationAttempt == undefined || parseInt(collegeGroup.embeddedData.invitationAttempt) < 3)
                && moreThanOneWeek(currentDate, new Date(collegeGroup.embeddedData.dateInvited))
        );

        for (let x = 0; x < activeCollegeGroups.length; x++) {
            const currentEmail = {
                email: activeCollegeGroups[x].email,
                subject: "",
                body: "",
                key: config.emailSendWorkflowKey,
            };

            await axios.post(urls.invokeInviteReminderWorkflow(), currentEmail);

            let attempt = 2;
            if (activeCollegeGroups[x].embeddedData.invitationAttempt != undefined)
                attempt = parseInt(activeCollegeGroups[x].embeddedData.invitationAttempt)+1;
            updateInvitationDetails(activeCollegeGroups[x].contactId, attempt, formatDate(currentDate, 'yyyy-mm-dd'));
        }
        return {
            body: JSON.stringify({
                result: "success"
            }),
        };
    },

});

function moreThanOneWeek (currentDate: any, invitedDate: any) {
    let days: any = Math.abs(currentDate - invitedDate);
    let diffDays = Math.ceil(days / (1000 * 60 * 60 * 24)); 
    if (diffDays > 7) 
        return true;
    return false;
};

async function updateInvitationDetails(
    contactId: string, 
    attempt: number, 
    currentFormattedDate: string) {
    let collegeGroup = {
        embeddedData: {
            invitationAttempt: attempt,
            dateInvited: currentFormattedDate
        },
    };
    const update_college_URL =
        urls.updateCollegeGroup() + "/" + contactId;
    await axios.put(update_college_URL, collegeGroup, {
        headers: urls.qualtricsHeader(),
    });
}