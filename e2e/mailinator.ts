import {
  GetInboxRequest,
  MailinatorClient,
  GetLinksRequest,
  DeleteInboxMessagesRequest,
  GetMessageRequest,
  DeleteMessageRequest,
} from "mailinator-client";
import config from "../src/config";

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

export const getMessage = async (inbox: string, messageId: string) => {
  const response = await mailinatorClient.request(
    new GetMessageRequest(config.mailinatorDomain, inbox, messageId),
  );

  return response.result;
};

export const deleteInbox = async (inbox: string) => {
  const response = await mailinatorClient.request(
    new DeleteInboxMessagesRequest(config.mailinatorDomain, inbox),
  );

  return response.result;
};

export const deleteMessage = async (inbox: string, messageId: string) => {
  const response = await mailinatorClient.request(
    new DeleteMessageRequest(config.mailinatorDomain, inbox, messageId),
  );

  return response.result;
};
