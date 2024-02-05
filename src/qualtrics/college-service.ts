import config from "../config";
import { College } from "../types";
import {
    createOrUpdateContactByExtRef,
    deleteContactById,
    getMailingListContactByExtRef,
} from "./qualtrics-service";

export const createCollege = async (college: College) => {
    await createOrUpdateContactByExtRef(
        config.qualtricsMailingListColleges,
        college,
    );
};

export const deleteCollegeByExtRef = async (extRef: string) => {
    let college;
    do {
        college = await getMailingListContactByExtRef(
            config.qualtricsMailingListColleges,
            extRef,
        );

        if (college) {
            await deleteContactById(college.id);
        }
    } while (college);
};
