import config from "../config";
import { CollegeGroup } from "../types";
import {
    createOrUpdateContactByExtRef,
    deleteContactById,
    getAllMailingListContacts,
    getMailingListContactByExtRef,
} from "./qualtrics-service";
import axios from "axios";
const urls = require("../functions/urls");

export const getAllCollegeGroups = async (): Promise<CollegeGroup[]> => {
    return await getAllMailingListContacts(
        config.qualtricsMailingListCollegeGroups,
    );
};

export const createCollegeGroup = async (collegeGroup: CollegeGroup) => {
    await createOrUpdateContactByExtRef(
        config.qualtricsMailingListCollegeGroups,
        collegeGroup,
    );
};

export const deleteCollegeGroupByExtRef = async (extRef: string) => {
    let collegeGroup;
    do {
        collegeGroup = await getMailingListContactByExtRef(
            config.qualtricsMailingListCollegeGroups,
            extRef,
        );

        if (collegeGroup) {
            await deleteContactById(collegeGroup.id);
        }
    } while (collegeGroup);
};

export const getCollegeGroupByExtRef = async (
    extRef: string,
): Promise<CollegeGroup> => {
    return getMailingListContactByExtRef(
        config.qualtricsMailingListCollegeGroups,
        extRef,
    );
};

export const updateInvitationDetails = async (
    contactId: string, 
    attempt: number, 
    currentFormattedDate: string, 
    currentStatus: string) => {
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
