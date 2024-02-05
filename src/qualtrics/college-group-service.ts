import config from "../config";
import { CollegeGroup } from "../types";
import {
    createOrUpdateContactByExtRef,
    deleteContactById,
    getMailingListContactByExtRef,
} from "./qualtrics-service";

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
