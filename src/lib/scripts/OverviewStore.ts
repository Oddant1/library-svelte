import { writable } from "svelte/store";

export const overview = writable<{
  repo_overviews: Object[];
  filter: string;
  filtered_overviews: Object[];
  date_fetched: string;
}>({
  repo_overviews: [],
  filter: "",
  filtered_overviews: [],
  date_fetched: "",
});