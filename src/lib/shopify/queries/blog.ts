import imageFragment from "../fragments/image";
import seoFragment from "../fragments/seo";

/**
 * Article shape used by every blog surface. `content` is the plain-text body,
 * used to synthesise an excerpt when the merchant left the excerpt field empty
 * - Shopify returns "" rather than null there. Rendered HTML (`contentHtml`)
 * is pulled only on the detail query.
 */
const articleFragment = /* GraphQL */ `
  fragment article on Article {
    id
    handle
    title
    excerpt
    content
    publishedAt
    tags
    image {
      ...image
    }
    authorV2 {
      name
    }
    blog {
      handle
      title
    }
    seo {
      ...seo
    }
  }
  ${imageFragment}
  ${seoFragment}
`;

export const getBlogsQuery = /* GraphQL */ `
  query getBlogs($first: Int!) {
    blogs(first: $first) {
      edges {
        node {
          id
          handle
          title
          seo {
            ...seo
          }
        }
      }
    }
  }
  ${seoFragment}
`;

export const getBlogQuery = /* GraphQL */ `
  query getBlog($handle: String!, $first: Int!) {
    blog(handle: $handle) {
      id
      handle
      title
      seo {
        ...seo
      }
      articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
        edges {
          node {
            ...article
          }
        }
      }
    }
  }
  ${articleFragment}
`;

export const getArticleQuery = /* GraphQL */ `
  query getArticle($blogHandle: String!, $handle: String!) {
    blog(handle: $blogHandle) {
      handle
      title
      articleByHandle(handle: $handle) {
        ...article
        contentHtml
      }
    }
  }
  ${articleFragment}
`;

/**
 * Every article across every blog, newest first. Backs the `/blogs` index and
 * the homepage dispatch rail, both of which are blog-agnostic.
 */
export const getArticlesQuery = /* GraphQL */ `
  query getArticles($first: Int!) {
    articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
      edges {
        node {
          ...article
        }
      }
    }
  }
  ${articleFragment}
`;
