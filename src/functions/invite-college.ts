import "dotenv/config";
import config from "../config";
import { getAllCollegeGroups, updateInvitationDetails } from "../qualtrics/college-group-service";
import { formatDate } from "../qualtrics/data-service";
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
                && !collegeGroup.embeddedData?.unsubscribed
        );

        for (let x = 0; x < activeCollegeGroups.length; x++) {
            const currentEmail = {
                email: activeCollegeGroups[x].email,
                subject: "",
                body: "",
                key: config.emailSendWorkflowKey,
            };

            await axios.post(urls.invokeInviteCollegeWorkflow(), currentEmail);

            let attempt = 1;
            updateInvitationDetails(activeCollegeGroups[x].contactId, attempt, formatDate(currentDate, 'yyyy-mm-dd'), 'Invited');
        }
        return {
            body: JSON.stringify({
                result: "success"
            }),
        };
    },

});