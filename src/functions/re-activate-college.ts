import "dotenv/config";
import config from "../config";
import { getAllCollegeGroups } from "../qualtrics/college-group-service";
import { app } from "@azure/functions";
import axios from "axios";
const urls = require("./urls");

app.http("re-activate-college", {
    methods: ["GET", "POST"],
    authLevel: "function",
    handler: async (request, context) => {
        let activeCollegeGroups = (await getAllCollegeGroups()).filter(
            (collegeGroup) =>
                collegeGroup.embeddedData?.groupStatus == "Active" &&
                collegeGroup?.unsubscribed,
        );

        for (let x = 0; x < activeCollegeGroups.length; x++) {
            reSubscribeCollege(activeCollegeGroups[x].contactId);
        }
        return {
            body: JSON.stringify({
                result: "success",
            }),
        };
    },
});

async function reSubscribeCollege(contactId: string) {
    let collegeGroup = {
        unsubscribed: false,
    };
    const update_college_URL = urls.updateCollegeGroup() + "/" + contactId;
    await axios.put(update_college_URL, collegeGroup, {
        headers: urls.qualtricsHeader(),
    });
}
