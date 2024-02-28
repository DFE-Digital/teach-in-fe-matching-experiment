import "dotenv/config";
import config from "../config";
import { Candidate, CollegeGroup, Contact } from "../types";
import {
    getAllCollegeGroups,
    formatDate,
} from "../qualtrics/college-group-service";
import { getAllCandidates } from "../qualtrics/candidate-service";
import { app } from "@azure/functions";
import axios from "axios";
const urls = require("./urls");

app.http("prepare-report", {
    methods: ["GET", "POST"],
    authLevel: "function",
    handler: async (request, context) => {
        const timeElapsed = Date.now();
        const currentDate = new Date(timeElapsed);

        const candidate: Candidate[] = await getAllCandidates();

        let greaterLondon = []; // London
        let southEast = []; // South East
        let southWest = []; // South West
        let westMidlands = []; // West Midlands
        let northWest = []; // North West
        let northEast = []; // North East
        let yorkshire = []; // Yorkshire and The Humber
        let eastMidlands = []; // East Midlands
        let eastOfEngland = []; // East of England

        for (let x = 0; x < candidate.length; x++) {
            switch (candidate[x].embeddedData.region) {
                case "London":
                    greaterLondon.push(candidate[x]);
                    break;
                case "South East":
                    southEast.push(candidate[x]);
                    break;
                case "South West":
                    southWest.push(candidate[x]);
                    break;
                case "West Midlands":
                    westMidlands.push(candidate[x]);
                    break;
                case "North West":
                    northWest.push(candidate[x]);
                    break;
                case "North East":
                    northEast.push(candidate[x]);
                    break;
                case "Yorkshire and The Humber":
                    yorkshire.push(candidate[x]);
                    break;
                case "East Midlands":
                    eastMidlands.push(candidate[x]);
                    break;
                case "East of England":
                    eastOfEngland.push(candidate[x]);
                    break;

                default:
                    break;
            }
            // console.log('Name = ' + candidate[x].firstName + ' ' + candidate[x].lastName + ', Region = ' + candidate[x].embeddedData.region);
        }

        displayResultByRegion(greaterLondon, "London");
        displayResultByRegion(southEast, "South East");
        displayResultByRegion(southWest, "South West");
        displayResultByRegion(westMidlands, "West Midlands");
        displayResultByRegion(northWest, "North West");
        displayResultByRegion(northEast, "North East");
        displayResultByRegion(yorkshire, "Yorkshire and The Humber");
        displayResultByRegion(eastMidlands, "East Midlands");
        displayResultByRegion(eastOfEngland, "East of England");

        let activeCollegeGroups = (await getAllCollegeGroups()).filter(
            (collegeGroup) =>
                collegeGroup.embeddedData?.groupStatus != "Unregistered",
        );

        let needsInvite = 0;
        let invited = 0;
        let active = 0;
        let unsubscribed = 0;
        for (let y = 0; y < activeCollegeGroups.length; y++) {
            switch (activeCollegeGroups[y].embeddedData.groupStatus) {
                case "NeedsInvite":
                    needsInvite++;
                    break;
                case "Invited":
                    invited++;
                    break;
                case "Active":
                    active++;
                    break;

                default:
                    break;
            }
            if (activeCollegeGroups[y].unsubscribed) unsubscribed++;
        }

        console.log("");
        console.log(
            "------------------------------------------------------------------------------------------------------------------",
        );
        console.log(
            "                                         College status report",
        );
        console.log(
            "------------------------------------------------------------------------------------------------------------------",
        );
        console.log(
            "                                         Needs Invite = " +
                needsInvite,
        );
        console.log(
            "                                         Invited = " + invited,
        );
        console.log(
            "                                         Signed up = " + active,
        );
        console.log(
            "                                         Unsubscribed = " +
                unsubscribed,
        );

        return {
            body: JSON.stringify({
                result: "success",
            }),
        };
    },
});

function displayResultByRegion(region: Candidate[], regionName: string) {
    let zeroMatch = 0;
    let oneMatch = 0;
    let twoMatches = 0;
    let threeMatches = 0;
    let fourMatches = 0;
    let fiveMatches = 0;
    for (let i = 0; i < region.length; i++) {
        if (region[i].embeddedData.collegeGroup5Id != undefined) fiveMatches++;
        if (
            region[i].embeddedData.collegeGroup4Id != undefined &&
            region[i].embeddedData.collegeGroup5Id == undefined
        )
            fourMatches++;
        if (
            region[i].embeddedData.collegeGroup3Id != undefined &&
            region[i].embeddedData.collegeGroup4Id == undefined
        )
            threeMatches++;
        if (
            region[i].embeddedData.collegeGroup2Id != undefined &&
            region[i].embeddedData.collegeGroup3Id == undefined
        )
            twoMatches++;
        if (
            region[i].embeddedData.collegeGroup1Id != undefined &&
            region[i].embeddedData.collegeGroup2Id == undefined
        )
            oneMatch++;
        else zeroMatch++;
    }

    console.log(
        "********************************************************************************************************",
    );
    console.log(
        '                      Number of colleges matched per candidate in "' +
            regionName +
            '" region ',
    );
    console.log(
        "********************************************************************************************************",
    );

    console.log("                      Zero match = " + zeroMatch);
    console.log("                      One match = " + oneMatch);
    console.log("                      Two matches = " + twoMatches);
    console.log("                      Three matches = " + threeMatches);
    console.log("                      Four matches = " + fourMatches);
    console.log("                      Five matches = " + fiveMatches);
    console.log("");
}
