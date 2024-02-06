import config from "../config";
import { CollegeGroup } from "../types";
import {
    createOrUpdateContactByExtRef,
    deleteContactById,
    getAllMailingListContacts,
    getMailingListContactByExtRef,
} from "./qualtrics-service";

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
