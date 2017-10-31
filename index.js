"use strict";
/**
 * @author ZZU_SOFTBOY
 */
let Promise = require("bluebird");
let _ = require('lodash');
let fs = require('fs');
let Git = require("nodegit");
const { execSync,spawn } = require('child_process');

let generatePhpApiDocs = !!hexo.env.args.withPhpApidoc;

if (generatePhpApiDocs) {
   hexo.extend.filter.register("before_generate", function() {
      let get_php_apidoc_saved_dir = hexo.extend.helper.get("get_php_apidoc_saved_dir");
      let get_temp_dir = hexo.extend.helper.get("get_temp_dir");
      let get_root_dir = hexo.extend.helper.get("get_root_dir");
      let tempDir = get_temp_dir();
      let ideAutoCompleteDir = tempDir+'/ide-auto-complete';
      let apigenExec = get_root_dir()+"/tools/apigen/bin/apigen";
      return new Promise(function (resolve, reject)
      {
         if (!fs.existsSync(ideAutoCompleteDir)) {
            return Git.Clone("https://github.com/libpdk/ide-auto-complete.git", ideAutoCompleteDir).then(function(repository){
                  resolve(ideAutoCompleteDir);
            });
         }else {
            var repository;
           
            // first reset HEAD
            return Git.Repository.open(ideAutoCompleteDir).then(function(repo) {
               // Use repository
               repository = repo;
               return repository.fetchAll({
                  callbacks: {
                     credentials: function(url, userName) {
                        return Git.Cred.sshKeyFromAgent(userName);
                     },
                     certificateCheck: function() {
                        return 1;
                     }
                  }
               });
            }).then(function(){
               return repository.mergeBranches("master", "origin/master");
            }).then(function(){
               resolve(ideAutoCompleteDir);
            }).catch(function(error){
               console.log(error);
               reject();
            });
         }
      }).then(function(repoDir) {
         return new Promise(function (resovle, reject)
         {
            // Work with the repository object here.
            const ls = spawn('php', [apigenExec, "generate", "src", "--destination", get_php_apidoc_saved_dir()], {
               cwd:ideAutoCompleteDir
            });
            ls.stdout.on('data', (data) => {
               hexo.log.info(`${data}`);
            });
            ls.stderr.on('data', (data) => {
               hexo.log.warn(`${data}`);
            });
            ls.on('close', (code) => {
               if (0 !== code) {
                  hexo.log.error("apigen error");
                  reject("apigen error");
               } else {
                  resovle();
               }
            });
         });
      }).catch(function(error){
         hexo.log.error(error);
      });
   }, 1);
}