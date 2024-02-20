import "dotenv/config";
import config from "../config";
import { CollegeGroup } from "../types";
import {
    getAllCollegeGroups,
    updateCollegeGroupById,
} from "../qualtrics/college-group-service";
import {
    getCandidateByEmail,
    updateCandidate,
} from "../qualtrics/candidate-service";
import { app } from "@azure/functions";
import axios from "axios";
import urls from "./urls";

app.http("register-candidate", {
    methods: ["POST"],
    authLevel: "function",
    handler: async (request, console) => {
        const requestData: any = await request.json();

        const orderedReachableColleges = requestData.nearestColleges;
        const candidateLat = requestData.lat; //51.496351
        const candidateLong = requestData.long; // -0.087925
        const candidateRegion = requestData.region;
        const candidate = await getCandidateByEmail(requestData.email);

        // load all subscribed college-groups data from qualtrics to local list
        const collegeGroups = (await getAllCollegeGroups()).filter(
            (collegeGroup) => !collegeGroup.unsubscribed,
        );
        const collegeGroupsByExtRef: { [key: string]: CollegeGroup } = {};
        collegeGroups.forEach(
            (collegeGroup) =>
                (collegeGroupsByExtRef[collegeGroup.extRef] = collegeGroup),
        );

        const matches = [];

        for (const college of orderedReachableColleges) {
            // Have we found the group before?
            const existingMatch = matches.find(
                (match) => match.collegeGroupId == college.collegeGroupId,
            );

            if (existingMatch) {
                existingMatch.colleges.push(college.collegeId);
            } else {
                matches.push({
                    collegeGroupId: college.collegeGroupId,
                    colleges: [college.collegeId],
                });
            }
        }

        candidate.embeddedData.matched = matches.length > 0;
        candidate.embeddedData.lat = candidateLat;
        candidate.embeddedData.long = candidateLong;
        candidate.embeddedData.region = candidateRegion;

        for (let i = 0; i < Math.min(matches.length, 5); ++i) {
            candidate.embeddedData[`collegeGroup${i + 1}Id`] =
                matches[i].collegeGroupId;
            candidate.embeddedData[`collegeGroup${i + 1}Colleges`] =
                matches[i].colleges.join(",");

            const collegeGroup =
                collegeGroupsByExtRef[matches[i].collegeGroupId];

            if (collegeGroup.embeddedData.groupStatus == "Unregistered") {
                const updatedCollegeGroup: CollegeGroup = {
                    embeddedData: {
                        groupStatus: "NeedsInvite",
                    },
                };

                await updateCollegeGroupById(
                    collegeGroup.contactId,
                    updatedCollegeGroup,
                );
            }
        }

        updateCandidate(candidate);

        if (matches.length == 0) {
            const currentEmail = {
                email: candidate.email,
                firstName: candidate.firstName,
                subject: "",
                body: "",
                key: config.emailSendWorkflowKey,
            };
            await axios.post(urls.invokeInviteNoMatchWorkflow(), currentEmail);
        }

        return { body: JSON.stringify(orderedReachableColleges) };
    },
});
