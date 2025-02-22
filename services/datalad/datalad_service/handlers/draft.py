import falcon
import pygit2

from datalad_service.common.user import get_user_info
from datalad_service.common.git import git_commit


class DraftResource(object):
    def __init__(self, store):
        self.store = store

    def on_get(self, req, resp, dataset):
        """
        Return draft state (other than files).
        """
        if dataset:
            # Maybe turn this into status?
            dataset_path = self.store.get_dataset_path(dataset)
            repo = pygit2.Repository(dataset_path)
            commit = repo.revparse_single('HEAD')
            resp.media = {'hexsha': commit.hex,
                          'tree': commit.tree_id.hex}
            resp.status = falcon.HTTP_OK
        else:
            resp.status = falcon.HTTP_NOT_FOUND

    def on_post(self, req, resp, dataset):
        """
        Commit a draft change.

        This adds all files in the working tree.
        """
        if dataset:
            # Record if this was done on behalf of a user
            name, email = get_user_info(req)
            media_dict = {}
            if name and email:
                media_dict['name'] = name
                media_dict['email'] = email
            try:
                dataset_path = self.store.get_dataset_path(dataset)
                repo = pygit2.Repository(dataset_path)
                # Add all changes to the index
                if name and email:
                    author = pygit2.Signature(name, email)
                    media_dict['ref'] = git_commit(repo, ['.'], author).hex
                else:
                    media_dict['ref'] = git_commit(repo, ['.']).hex
                resp.media = media_dict
                resp.status = falcon.HTTP_OK
            except:
                raise
                resp.status = falcon.HTTP_INTERNAL_SERVER_ERROR
        else:
            resp.media = {
                'error': 'Missing or malformed dataset parameter in request.'}
            resp.status = falcon.HTTP_UNPROCESSABLE_ENTITY
