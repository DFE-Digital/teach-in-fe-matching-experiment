import "dotenv/config";
import config from "../config";
import { Candidate, CollegeGroup, Contact } from "../types";
import {
    getAllCollegeGroups,
    updateCollegeGroupById,
} from "../qualtrics/college-group-service";
import {
    getAllCandidates,
    getCandidateByEmail,
    updateCandidate,
} from "../qualtrics/candidate-service";
import { app } from "@azure/functions";
import axios from "axios";
import urls from "./urls";

app.http("register-candidate", {
    methods: ["POST"],
    authLevel: "function",
    handler: async (request, context) => {
        const requestData: any = await request.json();

        const orderedReachableColleges =
            typeof requestData.nearestColleges == "string"
                ? JSON.parse(requestData.nearestColleges)
                : requestData.nearestColleges;
        const candidateLat = requestData.lat;
        const candidateLong = requestData.long;
        const candidateRegion = requestData.region;
        const candidate: Candidate = (await getAllCandidates()).find(
            (candidate) => candidate.email == requestData.email,
        );

        if (!candidate) {
            context.error("Register request received for missing candidate");
            return {
                status: 400,
                body: JSON.stringify({
                    error: "Candidate not found",
                }),
            };
        }

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

        let i = 1;
        for (const match of matches) {
            candidate.embeddedData[`collegeGroup${i}Id`] = match.collegeGroupId;
            candidate.embeddedData[`collegeGroup${i}Colleges`] =
                match.colleges.join(",");

            const collegeGroup = collegeGroupsByExtRef[match.collegeGroupId];

            if (!collegeGroup) {
                context.error(
                    "No record for matched college group %s - skipping",
                    match.collegeGroupId,
                );
                continue;
            }

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

            ++i;

            if (i > 5) {
                break;
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
