import {
  GetInboxRequest,
  MailinatorClient,
  GetLinksRequest,
  DeleteInboxMessagesRequest,
} from "mailinator-client";
import config from "./config";

export const mailinatorClient = new MailinatorClient(config.mailinatorApiKey);

export const getInbox = async (inbox: string) => {
  const response = await mailinatorClient.request(
    new GetInboxRequest(config.mailinatorDomain, inbox),
  );

  return response.result;
};

export const getMessageLinks = async (inbox: string, messageId: string) => {
  const response = await mailinatorClient.request(
    new GetLinksRequest(config.mailinatorDomain, inbox, messageId),
  );

  return response.result;
};

export const deleteInbox = async (inbox: string) => {
  const response = await mailinatorClient.request(
    new DeleteInboxMessagesRequest(config.mailinatorDomain, inbox),
  );

  return response.result;
};
