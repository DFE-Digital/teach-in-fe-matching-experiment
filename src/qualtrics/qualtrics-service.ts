import { Contact } from "../types";

import { default as axios } from "axios";
import config from "../config";

const qAxios = axios.create({
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Api-Token": config.qualtricsApiToken,
    },
});

qAxios.interceptors.request.use((request) => {
    // console.log('Starting Request', request.url)
    // console.log(JSON.stringify(request.data))
    return request;
});

// qAxios.interceptors.response.use(response => {
//     console.log('Response:', JSON.stringify(response, null, 1))
//     return response
// })

const urlDirectory = (poolId: string) =>
    `${config.qualtricsBaseUrl}/directories/${encodeURIComponent(poolId)}`;
const urlDirectoryContacts = (poolId: string) =>
    `${urlDirectory(poolId)}/contacts`;

const urlMailingList = (poolId: string, mailingListId: string) =>
    `${urlDirectory(poolId)}/mailinglists/${encodeURIComponent(mailingListId)}`;
const urlMailingListContacts = (poolId: string, mailingListId: string) =>
    `${urlMailingList(poolId, mailingListId)}/contacts`;

const urlDirectorySearch = (poolId: string) =>
    `${urlDirectoryContacts(poolId)}/search?includeEmbedded=true`;

const urlDirectoryContact = (poolId: string, contactId: string) =>
    `${urlDirectoryContacts(poolId)}/${encodeURIComponent(contactId)}`;

export const getMailingListContactByEmail = async <T extends Contact>(
    mailingListId: string,
    emailAddress: string,
): Promise<T> => {
    console.log(`Fetching contact with email address ${emailAddress}`);

    const response = await qAxios.post(
        urlDirectorySearch(config.qualtricsContactPoolId),
        {
            filter: {
                conjunction: "and",
                filters: [
                    {
                        filterType: "email",
                        comparison: "eq",
                        value: emailAddress,
                    },
                    {
                        filterType: "inList",
                        comparison: true,
                        mailingListId: mailingListId,
                    },
                ],
            },
        },
    );

    const contacts = response.data.result.elements;

    if (contacts.length > 0) {
        console.log(`Found contact`);
        contacts[0].extRef = contacts[0].externalDataReference; // Honestly ??!!
        contacts[0].phone = contacts[0].phoneNumber; // Honestly x 2 ??!!
        return contacts[0];
    } else {
        console.log(`Contact not found`);
        return null;
    }
};

export const getMailingListContactByExtRef = async <T extends Contact>(
    mailingListId: string,
    extRef: string,
): Promise<T> => {
    console.log(`Fetching contact with extRef ${extRef}`);

    const response = await qAxios.post(
        urlDirectorySearch(config.qualtricsContactPoolId),
        {
            filter: {
                conjunction: "and",
                filters: [
                    {
                        filterType: "extRef",
                        comparison: "eq",
                        value: extRef,
                    },
                    {
                        filterType: "inList",
                        comparison: true,
                        mailingListId: mailingListId,
                    },
                ],
            },
        },
    );

    const contacts = response.data.result.elements;

    if (contacts.length > 0) {
        console.log(`Found contact`);
        contacts[0].extRef = contacts[0].externalDataReference; // Honestly??!!
        return contacts[0];
    } else {
        console.log(`Contact not found`);
        return null;
    }
};

export const createMailingListContact = async (
    mailingListId: string,
    contact: Contact,
) => {
    console.log(`Creating new contact`);

    await qAxios.post(
        urlMailingListContacts(config.qualtricsContactPoolId, mailingListId),
        contact,
    );
};

export const updateContactById = async (
    contactId: string,
    contact: Contact,
) => {
    console.log(`Updating existing contact ${contactId}`);

    const toPut = {
        firstName: contact["firstName"],
        lastName: contact["lastName"],
        email: contact["email"],
        phone: contact["phone"],
        extRef: contact["extRef"],
        embeddedData: contact["embeddedData"],
        language: contact["language"],
        unsubscribed: contact["unsubscribed"],
    };

    await qAxios.put(
        urlDirectoryContact(config.qualtricsContactPoolId, contactId),
        toPut,
    );
};

export const createOrUpdateContactByEmail = async (
    mailingListId: string,
    contact: Contact,
) => {
    const existingContact: Contact = await getMailingListContactByEmail(
        mailingListId,
        contact.email,
    );

    if (existingContact == null) {
        createMailingListContact(mailingListId, contact);
    } else {
        updateContactById(existingContact.id, contact);
    }
};

export const createOrUpdateContactByExtRef = async (
    mailingListId: string,
    contact: Contact,
) => {
    const existingContact: Contact = await getMailingListContactByExtRef(
        mailingListId,
        contact.extRef,
    );

    if (existingContact == null) {
        createMailingListContact(mailingListId, contact);
    } else {
        updateContactById(existingContact.id, contact);
    }
};

export const deleteContactById = async (id: string) => {
    console.log(`Deleting contact with ID ${id}`);

    await qAxios.delete(urlDirectoryContact(config.qualtricsContactPoolId, id));
};

export const deleteContactByExtRef = async (
    mailingListId: string,
    extRef: string,
) => {
    console.log(`Deleting contact with extRef ${extRef}`);

    const existingContact: Contact = await getMailingListContactByExtRef(
        mailingListId,
        extRef,
    );

    await qAxios.delete(
        urlDirectoryContact(config.qualtricsContactPoolId, existingContact.id),
    );
};
