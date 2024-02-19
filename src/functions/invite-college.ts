import "dotenv/config";
import config from "../config";
import { getAllCollegeGroups, formatDate } from "../qualtrics/college-group-service";
import { app } from "@azure/functions";
import axios from "axios";
const urls = require("./urls");
 
app.http("invite-college", {
    methods: ["GET", "POST"],
    authLevel: "function",
    handler: async (request, context) => {
        const timeElapsed = Date.now();
        const currentDate = new Date(timeElapsed);

        let activeCollegeGroups = (await getAllCollegeGroups()).filter(
            (collegeGroup) =>
                collegeGroup.embeddedData?.groupStatus == "NeedsInvite"
                && !collegeGroup?.unsubscribed
        );

        for (let x = 0; x < activeCollegeGroups.length; x++) {
            const currentEmail = {
                email: activeCollegeGroups[x].email,
                groupName: activeCollegeGroups[x].embeddedData.groupName,
                contactId: activeCollegeGroups[x].contactId,
                firstName: activeCollegeGroups[x].firstName,
                lastName: activeCollegeGroups[x].lastName,
                subject: "",
                body: "",
                key: config.emailSendWorkflowKey,
            };

            await axios.post(urls.invokeInviteCollegeWorkflow(), currentEmail);

            let attempt = 1;
            setCollegeToInvited(activeCollegeGroups[x].contactId, attempt, formatDate(currentDate, 'yyyy-mm-dd'));
        }
        return {
            body: JSON.stringify({
                result: "success"
            }),
        };
    },

});

async function setCollegeToInvited(
    contactId: string, 
    attempt: number, 
    currentFormattedDate: string) {
    let collegeGroup = {
        embeddedData: {
            invitationAttempt: attempt,
            dateInvited: currentFormattedDate,
            groupStatus: "Invited"
        },
    };
    const update_college_URL =
        urls.updateCollegeGroup() + "/" + contactId;
    await axios.put(update_college_URL, collegeGroup, {
        headers: urls.qualtricsHeader(),
    });
}